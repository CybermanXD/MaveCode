import assert from "node:assert/strict"
import { createHash, createHmac, randomUUID } from "node:crypto"
import { createRequire } from "node:module"
import { after, before, describe, it } from "node:test"
import type { AddressInfo } from "node:net"

import { loadConfig, type HelperConfig } from "../../mavecode-admin-helper/src/config.js"
import { createHelperServer } from "../../mavecode-admin-helper/src/server.js"
import {
	MaveCodeAppsScriptClient,
	MaveCodeBackendError,
} from "../../../src/services/mavecode-appscript-client.js"
import {
	finalProviderResponse,
	firstTurnProviderResponse,
	INTAKE_SECRET,
	MODEL,
	PROVIDER_ACCESS_TOKEN,
	PROVIDER_REFRESH_TOKEN,
	toolDefinition,
} from "./fixtures.js"

const require = createRequire(import.meta.url)
const nativeFetch = globalThis.fetch
const backend = require("../../mavecode-appscript/src/core.js") as {
	handle(method: string, event: BackendEvent, dependencies: BackendDependencies): BackendResult
}

interface BackendEvent {
	postData: { contents: string }
	parameter: Record<string, string>
}

interface BackendResult {
	status: number
	body: { ok: boolean; protocolVersion: string; data?: unknown; error?: { code: string; message: string; retryable: boolean } }
}

interface BackendDependencies {
	properties: ReturnType<typeof createBackendDependencies>["properties"]
	cache: ReturnType<typeof createBackendDependencies>["cache"]
	lock: ReturnType<typeof createBackendDependencies>["lock"]
	crypto: ReturnType<typeof createBackendDependencies>["crypto"]
	identity: { getEmail(): string }
	fetch: (url: string, options: Record<string, unknown>) => ProviderResponse
	now(): number
}

interface ProviderResponse {
	getResponseCode(): number
	getContentText(): string
}

const captures = {
	extensionTraffic: [] as string[],
	helperLogs: [] as string[],
	providerRequests: [] as Array<{ url: string; body: Record<string, unknown>; authorization: string }>,
	intake: undefined as undefined | { url: string; body: string },
}

let clock = 1_900_000_000_000
let providerMode: "normal" | "error" = "normal"
let identity = "admin@example.invalid"
const dependencies = createBackendDependencies()
let helperBaseUrl = ""
let helper: ReturnType<typeof createHelperServer>
let extensionClient: MaveCodeAppsScriptClient
let sessionToken = ""

describe("Phase 1.10 simulated local MaveCode E2E", () => {
	before(async () => {
		const loaded = loadConfig({
			MAVECODE_CODEX_CLIENT_ID: "local-e2e-client",
			MAVECODE_CODEX_REDIRECT_URI: "http://localhost:1455/auth/callback",
			MAVECODE_APPS_SCRIPT_URL: "https://script.google.com/macros/s/local-e2e-deployment/exec",
			MAVECODE_INTAKE_SECRET: INTAKE_SECRET,
			MAVECODE_HELPER_PORT: "0",
		})
		assert.equal(loaded.host, "127.0.0.1")
		assert.equal(loaded.intakeSecret, INTAKE_SECRET)
		const config: HelperConfig = loaded
		helper = createHelperServer(config, {
			now: () => clock,
			fetch: helperFetch,
			logger: {
				info: (...values: unknown[]) => captures.helperLogs.push(JSON.stringify(values)),
				error: (...values: unknown[]) => captures.helperLogs.push(JSON.stringify(values)),
			},
		})
		await new Promise<void>((resolve) => helper.listen(0, "127.0.0.1", resolve))
		helperBaseUrl = `http://127.0.0.1:${(helper.address() as AddressInfo).port}`
		extensionClient = new MaveCodeAppsScriptClient("https://script.google.com/macros/s/local-e2e-deployment/exec")
		globalThis.fetch = extensionFetch
	})

	after(async () => {
		await new Promise<void>((resolve, reject) => helper.close((error) => (error ? reject(error) : resolve())))
	})

	it("simulates helper config plus OAuth state/PKCE callback and signed token intake", async () => {
		const start = await fetch(`${helperBaseUrl}/auth/start`, { redirect: "manual" })
		assert.equal(start.status, 302)
		const authorization = new URL(start.headers.get("location")!)
		assert.equal(authorization.searchParams.get("redirect_uri"), "http://localhost:1455/auth/callback")
		assert.equal(authorization.searchParams.get("codex_cli_simplified_flow"), "true")
		assert.equal(authorization.searchParams.get("originator"), "mave-code")
		assert.equal(authorization.searchParams.get("code_challenge_method"), "S256")
		assert.match(authorization.searchParams.get("code_challenge")!, /^[A-Za-z0-9_-]{43}$/)
		const state = authorization.searchParams.get("state")!

		const callback = await fetch(`${helperBaseUrl}/auth/callback?code=local-code&state=${encodeURIComponent(state)}`)
		assert.equal(callback.status, 200)
		assert.equal(dependencies.providerStatus().connected, true)
		assert.ok(captures.intake)

		const replay = routeBackend(captures.intake!.body, new URL(captures.intake!.url))
		assert.equal(replay.status, 409)
		assert.equal(replay.body.error?.code, "REPLAY_DETECTED")
	})

	it("reports provider ready and issues, verifies, refreshes, and revokes extension sessions", async () => {
		const status = actionDirect("provider-status", {})
		assert.equal((status.body.data as { connected: boolean }).connected, true)

		identity = "user@example.invalid"
		const issued = await extensionClient.action<{ sessionToken: string }>("session-issue")
		sessionToken = issued.sessionToken
		assert.match(sessionToken, /^mave_ext_/)
		const verified = await extensionClient.action<{ valid: boolean }>("session-verify", { sessionToken })
		assert.equal(verified.valid, true)

		const refreshed = await extensionClient.action<{ sessionToken: string }>("session-refresh", { sessionToken })
		assert.notEqual(refreshed.sessionToken, sessionToken)
		await assert.rejects(extensionClient.action("session-verify", { sessionToken }), hasCode("SESSION_EXPIRED"))
		sessionToken = refreshed.sessionToken

		await extensionClient.action("session-revoke", { sessionToken })
		await assert.rejects(extensionClient.action("session-verify", { sessionToken }), hasCode("SESSION_EXPIRED"))
		sessionToken = (await extensionClient.action<{ sessionToken: string }>("session-issue")).sessionToken
	})

	it("loads models and completes a multi-turn approved local tool loop with usage", async () => {
		const persistedProfile: Record<string, unknown> = {
			apiProvider: "mave-gateway",
			maveGatewayBaseUrl: "https://script.google.com/macros/s/local-e2e-deployment/exec",
			maveGatewayModelId: MODEL,
		}
		assert.equal(persistedProfile.apiProvider, "mave-gateway")
		const catalog = await extensionClient.action<{ models: Array<{ id: string; capabilities: { tools: boolean } }> }>(
			"models",
			{ sessionToken },
		)
		const fixtureModel = catalog.models.find((model) => model.id === MODEL)
		assert.ok(fixtureModel, "managed model catalog should include the local E2E fixture model")
		assert.equal(fixtureModel.capabilities.tools, true)

		const first = await extensionClient.action<{ events: Array<Record<string, unknown>> }>("chat", {
			sessionToken,
			protocolVersion: "mavecode.v1",
			model: MODEL,
			messages: [{ role: "user", content: "Read the approved fixture and answer." }],
			tools: [toolDefinition],
			parallelToolCalls: false,
		})
		const toolCall = first.events.find((event) => event.type === "tool_call")!
		assert.deepEqual(toolCall, {
			type: "tool_call",
			id: "call_local_1",
			name: "read_local_file",
			arguments: JSON.stringify({ path: "fixtures/answer.txt" }),
		})
		assert.deepEqual(first.events.find((event) => event.type === "usage"), {
			type: "usage",
			inputTokens: 12,
			outputTokens: 5,
			totalTokens: 17,
		})

		const final = await extensionClient.action<{ events: Array<Record<string, unknown>> }>("chat", {
			sessionToken,
			protocolVersion: "mavecode.v1",
			model: MODEL,
			messages: [
				{ role: "user", content: "Read the approved fixture and answer." },
				{ role: "assistant", content: "", toolCalls: [toolCall] },
				{ role: "tool", toolCallId: toolCall.id, content: "42" },
			],
			tools: [toolDefinition],
			parallelToolCalls: false,
		})
		assert.equal(final.events.find((event) => event.type === "text")?.text, "The approved fixture says 42.")
		assert.equal(final.events.at(-1)?.type, "completed")
		assert.equal(captures.providerRequests.length, 2)
		assert.equal(captures.providerRequests[0]!.url, "https://chatgpt.com/backend-api/codex/responses")
		assert.deepEqual((captures.providerRequests[1]!.body.input as Array<Record<string, unknown>>).at(-1), {
			type: "function_call_output",
			call_id: "call_local_1",
			output: "42",
		})
	})

	it("normalizes malformed signature, quota, provider error, and expiry failures", async () => {
		const intake = captures.intake!
		const malformedUrl = new URL(intake.url)
		malformedUrl.searchParams.set("nonce", "different_nonce_123456")
		malformedUrl.searchParams.set("signature", "malformed")
		const malformed = routeBackend(intake.body, malformedUrl)
		assert.equal(malformed.body.error?.code, "INVALID_SIGNATURE")

		dependencies.properties.setProperty("MAVECODE_QUOTA_PER_MINUTE", "1")
		dependencies.cache.clearQuota()
		await extensionClient.action("chat", basicChat())
		await assert.rejects(extensionClient.action("chat", basicChat()), hasCode("QUOTA_EXCEEDED", true))
		dependencies.properties.setProperty("MAVECODE_QUOTA_PER_MINUTE", "20")
		dependencies.cache.clearQuota()

		providerMode = "error"
		await assert.rejects(extensionClient.action("chat", basicChat()), hasCode("PROVIDER_ERROR", true))
		providerMode = "normal"

		const provider = JSON.parse(dependencies.properties.getProperty("provider.codex")!) as { expiresAt: number }
		provider.expiresAt = clock - 1
		dependencies.properties.setProperty("provider.codex", JSON.stringify(provider))
		await assert.rejects(extensionClient.action("chat", basicChat()), hasCode("PROVIDER_EXPIRED"))
		provider.expiresAt = clock + 3_600_000
		dependencies.properties.setProperty("provider.codex", JSON.stringify(provider))

		clock += 900_001
		await assert.rejects(extensionClient.action("session-verify", { sessionToken }), hasCode("SESSION_EXPIRED"))
		clock -= 900_001
	})

	it("revokes provider authorization and proves extension-facing captures are secret-free", async () => {
		identity = "admin@example.invalid"
		const revoked = actionDirect("provider-revoke", {})
		assert.equal((revoked.body.data as { revoked: boolean }).revoked, true)
		assert.equal(dependencies.providerStatus().connected, false)

		const extensionFacing = JSON.stringify({
			traffic: captures.extensionTraffic,
			storage: { profile: { apiProvider: "mave-gateway", model: MODEL }, sessionStoredBySecretStorage: true },
			logs: captures.helperLogs,
		})
		for (const secret of [PROVIDER_ACCESS_TOKEN, PROVIDER_REFRESH_TOKEN, INTAKE_SECRET]) {
			assert.equal(extensionFacing.includes(secret), false, `extension-facing capture leaked ${secret}`)
		}
	})
})

function basicChat(): Record<string, unknown> {
	return {
		sessionToken,
		protocolVersion: "mavecode.v1",
		model: MODEL,
		messages: [{ role: "user", content: "hello again" }],
	}
}

function hasCode(code: string, retryable?: boolean): (error: unknown) => boolean {
	return (error) =>
		error instanceof MaveCodeBackendError && error.code === code && (retryable === undefined || error.retryable === retryable)
}

async function helperFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
	const url = new URL(String(input))
	if (url.hostname === "auth.openai.com") {
		const form = new URLSearchParams(String(init?.body))
		assert.equal(form.get("code"), "local-code")
		assert.ok(form.get("code_verifier"))
		const claims = Buffer.from(JSON.stringify({ chatgpt_account_id: "account-local", email: "admin@example.invalid" })).toString("base64url")
		return Response.json({
			access_token: PROVIDER_ACCESS_TOKEN,
			refresh_token: PROVIDER_REFRESH_TOKEN,
			id_token: `header.${claims}.signature`,
			expires_in: 3600,
		})
	}
	if (url.hostname === "script.googleusercontent.com") {
		assert.deepEqual(init, { method: "GET", redirect: "manual" })
		assert.ok(captures.intake)
		const result = routeBackend(captures.intake.body, new URL(captures.intake.url))
		return Response.json(result.body, { status: result.status })
	}
	const body = String(init?.body ?? "")
	assert.equal(url.hostname, "script.google.com")
	assert.equal(init?.method, "POST")
	assert.equal(init?.redirect, "manual")
	captures.intake = { url: url.toString(), body }
	return new Response(null, {
		status: 302,
		headers: { location: "https://script.googleusercontent.com/macros/echo?user_content_key=local-opaque-result" },
	})
}

async function extensionFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
	const target = new URL(String(input))
	if (target.hostname === "127.0.0.1") return nativeFetch(input, init)
	const body = String(init?.body ?? "")
	const parsed = JSON.parse(body) as Record<string, unknown>
	const safeCapture = { ...parsed }
	if ("sessionToken" in safeCapture) safeCapture.sessionToken = "[SESSION_PRESENT]"
	captures.extensionTraffic.push(JSON.stringify(safeCapture))
	const result = routeBackend(body, target)
	return Response.json(result.body, { status: result.status })
}

function routeBackend(rawBody: string, url: URL): BackendResult {
	return backend.handle(
		"POST",
		{ postData: { contents: rawBody }, parameter: Object.fromEntries(url.searchParams) },
		dependencies as unknown as BackendDependencies,
	)
}

function actionDirect(action: string, body: Record<string, unknown>): BackendResult {
	const rawBody = JSON.stringify({ action, ...body })
	return routeBackend(rawBody, new URL("https://script.google.com/macros/s/local-e2e-deployment/exec"))
}

function createBackendDependencies() {
	const values = new Map<string, string>([
		["MAVECODE_INTAKE_SECRET", INTAKE_SECRET],
		["MAVECODE_ALLOWED_USERS", "user@example.invalid"],
		["MAVECODE_ENABLE_LEGACY_SESSION_ISSUE", "true"],
		["MAVECODE_ADMIN_USERS", "admin@example.invalid"],
		["MAVECODE_MODEL_ALLOWLIST", MODEL],
	])
	const cacheValues = new Map<string, string>()
	const properties = {
		getProperty: (key: string) => values.get(key) ?? null,
		setProperty: (key: string, value: string) => values.set(key, String(value)),
		deleteProperty: (key: string) => values.delete(key),
	}
	const cache = {
		get: (key: string) => cacheValues.get(key) ?? null,
		put: (key: string, value: string) => cacheValues.set(key, String(value)),
		clearQuota: () => {
			for (const key of cacheValues.keys()) if (key.startsWith("quota:")) cacheValues.delete(key)
		},
	}
	let locked = false
	const lock = {
		tryLock: () => (locked ? false : (locked = true)),
		releaseLock: () => {
			locked = false
		},
	}
	const signed = (value: number) => (value > 127 ? value - 256 : value)
	const unsigned = (value: number) => (value < 0 ? value + 256 : value)
	const crypto = {
		DigestAlgorithm: { SHA_256: "sha256" },
		Charset: { UTF_8: "utf8" },
		computeDigest: (_algorithm: string, value: string) => [...createHash("sha256").update(value).digest()].map(signed),
		computeHmacSha256Signature: (value: string, secret: string) =>
			[...createHmac("sha256", secret).update(value).digest()].map(signed),
		base64EncodeWebSafe: (value: number[] | string) =>
			Buffer.from(Array.isArray(value) ? value.map(unsigned) : value).toString("base64url"),
		getUuid: randomUUID,
	}
	return {
		properties,
		cache,
		lock,
		crypto,
		identity: { getEmail: () => identity },
		fetch: (url: string, options: Record<string, unknown>): ProviderResponse => {
			const headers = options.headers as { Authorization: string }
			const body = JSON.parse(String(options.payload)) as Record<string, unknown>
			captures.providerRequests.push({ url, body, authorization: headers.Authorization })
			if (providerMode === "error") {
				return { getResponseCode: () => 429, getContentText: () => JSON.stringify({ error: { message: "quota" } }) }
			}
			const input = body.input as Array<{ type?: string }>
			const response = input.some((item) => item.type === "function_call_output")
				? finalProviderResponse
				: input.length === 1 && body.tools
					? firstTurnProviderResponse
					: finalProviderResponse
			return { getResponseCode: () => 200, getContentText: () => JSON.stringify(response) }
		},
		now: () => clock,
		providerStatus: () => {
			const raw = properties.getProperty("provider.codex")
			return { connected: Boolean(raw && (JSON.parse(raw) as { expiresAt: number }).expiresAt > clock) }
		},
	}
}

import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import type { Server } from "node:http"
import { afterEach, describe, it, mock } from "node:test"
import type { HelperConfig } from "../src/config.js"
import { createHelperServer } from "../src/server.js"
import { verifySignature } from "../src/security.js"

const secret = "s".repeat(32)
const config: HelperConfig = {
	host: "127.0.0.1",
	port: 0,
	clientId: "client-id",
	redirectUri: "http://localhost:1455/auth/callback",
	appsScriptUrl: "https://script.google.com/macros/s/deployment/exec",
	intakeSecret: secret,
	stateTtlMs: 600_000,
	maxBodyBytes: 1_024,
	authorizationEndpoint: "https://auth.openai.com/oauth/authorize",
	tokenEndpoint: "https://auth.openai.com/oauth/token",
}

const servers: Server[] = []

afterEach(async () => {
	await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
})

async function start(fetchMock: typeof fetch = mock.fn<typeof fetch>()): Promise<{ base: string; fetchMock: typeof fetch }> {
	const server = createHelperServer(config, {
		fetch: fetchMock,
		now: () => 10_000,
		logger: { info: mock.fn(), error: mock.fn() },
	})
	servers.push(server)
	await new Promise<void>((resolve, reject) => server.listen(0, "127.0.0.1", resolve).once("error", reject))
	const address = server.address() as AddressInfo
	assert.equal(address.address, "127.0.0.1")
	return { base: `http://127.0.0.1:${address.port}`, fetchMock }
}

describe("route and security behavior", () => {
	it("returns minimal health with security headers and no default CORS", async () => {
		const { base } = await start()
		const response = await fetch(`${base}/health`)
		const body = await response.json()
		assert.deepEqual(body, { ok: true, service: "mavecode-admin-helper", connected: false, backendConfigured: true })
		assert.equal(response.headers.get("access-control-allow-origin"), null)
		assert.equal(response.headers.get("cache-control"), "no-store")
	})

	it("creates authorization state and rejects invalid callbacks without exchanging tokens", async () => {
		const fetchMock = mock.fn<typeof fetch>()
		const { base } = await start(fetchMock)
		const startResponse = await fetch(`${base}/auth/start`, { redirect: "manual" })
		const authorization = new URL(startResponse.headers.get("location")!)
		assert.equal(authorization.href.startsWith(`${config.authorizationEndpoint}?`), true)
		assert.equal(authorization.searchParams.get("client_id"), config.clientId)
		assert.equal(authorization.searchParams.get("redirect_uri"), "http://localhost:1455/auth/callback")
		assert.equal(authorization.searchParams.get("response_type"), "code")
		assert.equal(authorization.searchParams.get("scope"), "openid profile email offline_access")
		assert.equal(authorization.searchParams.get("code_challenge_method"), "S256")
		assert.ok(authorization.searchParams.get("code_challenge"))
		assert.ok(authorization.searchParams.get("state"))
		assert.equal(authorization.searchParams.get("codex_cli_simplified_flow"), "true")
		assert.equal(authorization.searchParams.get("originator"), "mave-code")
		assert.deepEqual(
			[...authorization.searchParams.keys()].sort(),
			[
				"client_id",
				"code_challenge",
				"code_challenge_method",
				"codex_cli_simplified_flow",
				"originator",
				"redirect_uri",
				"response_type",
				"scope",
				"state",
			].sort(),
		)
		const callback = await fetch(`${base}/auth/callback?code=code&state=wrong`)
		assert.equal(callback.status, 400)
		assert.doesNotMatch(await callback.text(), /code/)
		assert.equal(fetchMock.mock.callCount(), 0)
	})

	it("exchanges with PKCE and follows an Apps Script ContentService redirect without forwarding credentials", async () => {
		let call = 0
		const fetchMock = mock.fn<typeof fetch>(async (input, init) => {
			call += 1
			if (call === 1) {
				return Response.json({ access_token: "access-secret", refresh_token: "refresh-secret", expires_in: 3600 })
			}
			if (call === 2) {
				const intakeUrl = new URL(String(input))
				assert.equal(`${intakeUrl.origin}${intakeUrl.pathname}`, config.appsScriptUrl)
				assert.ok(init)
				const headers = new Headers(init.headers)
				const body = String(init.body)
				assert.match(body, /access-secret/)
				assert.equal(intakeUrl.searchParams.get("timestamp"), headers.get("x-mavecode-timestamp"))
				assert.equal(intakeUrl.searchParams.get("nonce"), headers.get("x-mavecode-nonce"))
				assert.equal(intakeUrl.searchParams.get("signature"), headers.get("x-mavecode-signature"))
				assert.equal(
					verifySignature(
						secret,
						headers.get("x-mavecode-timestamp")!,
						headers.get("x-mavecode-nonce")!,
						body,
						headers.get("x-mavecode-signature")!,
					),
					true,
				)
				assert.equal(init.redirect, "manual")
				return new Response(null, {
					status: 302,
					headers: { location: "https://script.googleusercontent.com/macros/echo?user_content_key=opaque-result-key" },
				})
			}
			assert.equal(String(input), "https://script.googleusercontent.com/macros/echo?user_content_key=opaque-result-key")
			assert.deepEqual(init, { method: "GET", redirect: "manual" })
			return Response.json({ ok: true })
		})
		const { base } = await start(fetchMock)
		const authorization = new URL((await fetch(`${base}/auth/start`, { redirect: "manual" })).headers.get("location")!)
		const callback = await fetch(`${base}/auth/callback?code=one-time-code&state=${authorization.searchParams.get("state")}`)
		assert.equal(callback.status, 200)
		const callbackText = await callback.text()
		assert.match(callbackText, /authorization received and token relay succeeded/i)
		assert.doesNotMatch(callbackText, /access-secret|refresh-secret|one-time-code/)
		assert.equal(fetchMock.mock.callCount(), 3)
		const tokenRequest = await fetch(`${base}/token-package`, { method: "POST" })
		assert.equal(tokenRequest.status, 404)
		assert.doesNotMatch(await tokenRequest.text(), /secret/)
		const healthText = await (await fetch(`${base}/health`)).text()
		assert.doesNotMatch(healthText, /access-secret|refresh-secret/)
	})

	it("reports backend logical failure accurately, logs safely, and keeps credentials for relay retry", async () => {
		let relayAttempt = 0
		const logger = { info: mock.fn<Console["info"]>(), error: mock.fn<Console["error"]>() }
		const fetchMock = mock.fn<typeof fetch>(async (input) => {
			if (String(input) === config.tokenEndpoint) {
				return Response.json({ access_token: "access-secret", refresh_token: "refresh-secret", expires_in: 3600 })
			}
			relayAttempt += 1
			return relayAttempt === 1
				? Response.json({
						ok: false,
						error: {
							code: "INVALID_SIGNATURE",
							message: "Signed intake was rejected at https://script.google.com/exec?signature=secret-signature nonce=secret-nonce",
						},
					})
				: Response.json({ ok: true })
		})
		const server = createHelperServer(config, { fetch: fetchMock, now: () => 10_000, logger })
		servers.push(server)
		await new Promise<void>((resolve, reject) => server.listen(0, "127.0.0.1", resolve).once("error", reject))
		const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
		const authorization = new URL((await fetch(`${base}/auth/start`, { redirect: "manual" })).headers.get("location")!)

		const callback = await fetch(`${base}/auth/callback?code=one-time-code&state=${authorization.searchParams.get("state")}`)
		assert.equal(callback.status, 502)
		const callbackText = await callback.text()
		assert.match(callbackText, /authorization was received, but token relay failed \(INVALID_SIGNATURE\)/i)
		assert.match(callbackText, /use \/relay to retry/i)
		assert.doesNotMatch(callbackText, /access-secret|refresh-secret|one-time-code/)

		const health = (await (await fetch(`${base}/health`)).json()) as Record<string, unknown>
		assert.equal(health.connected, true)
		assert.deepEqual(health.lastRelay, {
			ok: false,
			at: 10_000,
			status: 200,
			redirects: 0,
			code: "INVALID_SIGNATURE",
			error: "Signed intake was rejected at [REDACTED_URL] nonce=[REDACTED]",
		})
		const logs = JSON.stringify(logger.error.mock.calls)
		assert.match(logs, /INVALID_SIGNATURE|backend-protocol/)
		assert.doesNotMatch(logs, /access-secret|refresh-secret|secret-signature|secret-nonce|script\.google\.com\/exec/)

		const retry = await fetch(`${base}/relay`, { method: "POST" })
		assert.equal(retry.status, 200)
		assert.equal((await retry.json()).ok, true)
	})

	it("blocks Apps Script redirects to untrusted hosts without following them", async () => {
		const fetchMock = mock.fn<typeof fetch>(async (input) => {
			if (String(input) === config.tokenEndpoint) return Response.json({ access_token: "access-secret", expires_in: 3600 })
			return new Response(null, { status: 302, headers: { location: "https://attacker.invalid/collect" } })
		})
		const { base } = await start(fetchMock)
		const authorization = new URL((await fetch(`${base}/auth/start`, { redirect: "manual" })).headers.get("location")!)
		const callback = await fetch(`${base}/auth/callback?code=one-time-code&state=${authorization.searchParams.get("state")}`)
		assert.equal(callback.status, 502)
		assert.match(await callback.text(), /RELAY_REDIRECT_BLOCKED/)
		assert.equal(fetchMock.mock.callCount(), 2)
	})

	it("enforces exact backend configuration and request size limits", async () => {
		const { base } = await start()
		const wrong = await fetch(`${base}/configure`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ appsScriptUrl: "https://script.google.com/macros/s/other/exec" }),
		})
		assert.equal(wrong.status, 400)
		const exact = await fetch(`${base}/configure`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ appsScriptUrl: config.appsScriptUrl }),
		})
		assert.equal(exact.status, 200)
		const oversized = await fetch(`${base}/configure`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ padding: "x".repeat(config.maxBodyBytes + 1) }),
		})
		assert.equal(oversized.status, 413)
	})

	it("requires credentials for relay and clears status on logout", async () => {
		const { base } = await start()
		assert.equal((await fetch(`${base}/relay`, { method: "POST" })).status, 401)
		const logout = await fetch(`${base}/logout`, { method: "POST" })
		assert.deepEqual(await logout.json(), { ok: true, connected: false })
	})
})

import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http"
import { createNonce, createPkceState, redactSensitive, signPayload, validateState, type PkceState } from "./security.js"
import { validateBackendUrl, type HelperConfig } from "./config.js"

interface Credentials {
	accessToken: string
	refreshToken?: string
	idToken?: string
	expiresAt: number
	accountId?: string
	email?: string
}

interface Dependencies {
	fetch?: typeof fetch
	now?: () => number
	logger?: Pick<Console, "info" | "error">
}

interface RelayResult {
	ok: true
	at: number
	status: number
	redirects: number
}

interface RelayStatus {
	ok: boolean
	at: number
	status?: number
	redirects?: number
	code?: string
	error?: string
}

const MAX_APPS_SCRIPT_REDIRECTS = 3
const APPS_SCRIPT_RESPONSE_HOST = "script.googleusercontent.com"
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

export function createHelperServer(config: HelperConfig, dependencies: Dependencies = {}): Server {
	const request = dependencies.fetch ?? fetch
	const now = dependencies.now ?? Date.now
	const logger = dependencies.logger ?? console
	let oauthState: PkceState | undefined
	let credentials: Credentials | undefined
	let lastRelay: RelayStatus | undefined

	const route = async (incoming: IncomingMessage, response: ServerResponse): Promise<void> => {
		setSecurityHeaders(response, config, incoming)
		const url = new URL(incoming.url ?? "/", `http://${config.host}:${config.port}`)
		if (incoming.method === "GET" && url.pathname === "/health") {
			return json(response, 200, {
				ok: true,
				service: "mavecode-admin-helper",
				connected: Boolean(credentials && credentials.expiresAt > now()),
				backendConfigured: true,
				lastRelay,
			})
		}
		if (incoming.method === "GET" && url.pathname === "/auth/start") {
			oauthState = createPkceState(now())
			const parameters = new URLSearchParams({
				client_id: config.clientId,
				redirect_uri: config.redirectUri,
				response_type: "code",
				scope: "openid profile email offline_access",
				code_challenge: oauthState.challenge,
				code_challenge_method: "S256",
				state: oauthState.state,
				codex_cli_simplified_flow: "true",
				originator: "mave-code",
			})
			response.writeHead(302, { location: `${config.authorizationEndpoint}?${parameters}` })
			response.end()
			return
		}
		if (incoming.method === "GET" && url.pathname === "/auth/callback") {
			if (url.searchParams.get("error")) return html(response, 400, "Authorization was denied")
			const pending = oauthState
			oauthState = undefined
			try {
				validateState(pending, url.searchParams.get("state"), now(), config.stateTtlMs)
			} catch (error) {
				throw new HttpError(400, error instanceof Error ? error.message : "Invalid OAuth state")
			}
			const code = url.searchParams.get("code")
			if (!code) throw new HttpError(400, "Missing authorization code")
			const tokenResponse = await request(config.tokenEndpoint, {
				method: "POST",
				headers: { "content-type": "application/x-www-form-urlencoded" },
				body: new URLSearchParams({
					grant_type: "authorization_code",
					client_id: config.clientId,
					redirect_uri: config.redirectUri,
					code_verifier: pending!.verifier,
					code,
				}),
				redirect: "error",
			})
			const tokens = await limitedResponseJson(tokenResponse, config.maxBodyBytes)
			if (!tokenResponse.ok || typeof tokens.access_token !== "string") throw new Error("Codex token exchange failed")
			credentials = {
				accessToken: tokens.access_token,
				refreshToken: stringOrUndefined(tokens.refresh_token),
				idToken: stringOrUndefined(tokens.id_token),
				expiresAt: now() + numberOr(tokens.expires_in, 3600) * 1000,
				...readClaims(stringOrUndefined(tokens.id_token)),
			}
			try {
				lastRelay = await relay(config, credentials, request, now, config.maxBodyBytes)
			} catch (error) {
				const failure = relayFailure(error, now())
				lastRelay = failure.status
				logger.error(failure.log)
				return html(
					response,
					502,
					`Codex authorization was received, but token relay failed (${failure.code}): ${failure.message}. Credentials remain in memory; use /relay to retry.`,
				)
			}
			logger.info({
				message: "Token relay succeeded",
				stage: "complete",
				status: lastRelay.status,
				redirects: lastRelay.redirects,
				host: APPS_SCRIPT_RESPONSE_HOST,
			})
			return html(response, 200, "Codex authorization received and token relay succeeded. You may close this window.")
		}
		if (incoming.method === "POST" && url.pathname === "/configure") {
			const body = await readJson(incoming, config.maxBodyBytes)
			if (typeof body.appsScriptUrl !== "string" || validateBackendUrl(body.appsScriptUrl) !== config.appsScriptUrl) {
				throw new HttpError(400, "Backend URL must exactly match the configured allowlisted URL")
			}
			return json(response, 200, { ok: true, backendConfigured: true })
		}
		if (incoming.method === "POST" && url.pathname === "/relay") {
			await discardBody(incoming, config.maxBodyBytes)
			if (!credentials) throw new HttpError(401, "Codex is not connected")
			try {
				lastRelay = await relay(config, credentials, request, now, config.maxBodyBytes)
			} catch (error) {
				const failure = relayFailure(error, now())
				lastRelay = failure.status
				logger.error(failure.log)
				return json(response, 502, { ok: false, error: { code: failure.code, message: failure.message } })
			}
			logger.info({
				message: "Token relay succeeded",
				stage: "complete",
				status: lastRelay.status,
				redirects: lastRelay.redirects,
				host: APPS_SCRIPT_RESPONSE_HOST,
			})
			return json(response, 200, { ok: true, relayedAt: lastRelay.at, status: lastRelay.status })
		}
		if (incoming.method === "POST" && url.pathname === "/logout") {
			await discardBody(incoming, config.maxBodyBytes)
			credentials = undefined
			oauthState = undefined
			lastRelay = undefined
			return json(response, 200, { ok: true, connected: false })
		}
		throw new HttpError(404, "Not found")
	}

	return createServer((incoming, response) => {
		route(incoming, response).catch((error: unknown) => {
			const status = error instanceof HttpError ? error.status : error instanceof PayloadTooLargeError ? 413 : 500
			const message = status >= 500 ? "Internal server error" : error instanceof Error ? error.message : "Request failed"
			logger.error(redactSensitive({ message, error }))
			if (!response.headersSent) json(response, status, { ok: false, error: message })
			else response.end()
		})
	})
}

async function relay(
	config: HelperConfig,
	credentials: Credentials,
	request: typeof fetch,
	now: () => number,
	maxBytes: number,
): Promise<RelayResult> {
	const payload = JSON.stringify({
		action: "provider-token-intake",
		provider: "codex",
		credentials: {
			accessToken: credentials.accessToken,
			refreshToken: credentials.refreshToken,
			idToken: credentials.idToken,
			expiresAt: credentials.expiresAt,
			accountId: credentials.accountId,
			email: credentials.email,
		},
	})
	if (Buffer.byteLength(payload) > maxBytes) throw new PayloadTooLargeError()
	const timestamp = String(now())
	const nonce = createNonce()
	// Apps Script web-app events do not reliably expose arbitrary request headers.
	// Keep the signed body unchanged and transport authentication metadata in the query string.
	const intakeUrl = new URL(config.appsScriptUrl)
	intakeUrl.searchParams.set("timestamp", timestamp)
	intakeUrl.searchParams.set("nonce", nonce)
	intakeUrl.searchParams.set("signature", signPayload(config.intakeSecret, timestamp, nonce, payload))
	let response: Response
	try {
		response = await request(intakeUrl, {
		method: "POST",
		headers: {
			"content-type": "application/json; charset=utf-8",
			"x-mavecode-timestamp": timestamp,
			"x-mavecode-nonce": nonce,
			"x-mavecode-signature": intakeUrl.searchParams.get("signature")!,
		},
		body: payload,
		redirect: "manual",
		})
	} catch {
		throw new RelayError("RELAY_NETWORK_ERROR", "Apps Script token relay request failed", "initial-request")
	}

	let redirects = 0
	let currentUrl = intakeUrl
	while (REDIRECT_STATUSES.has(response.status)) {
		if (redirects >= MAX_APPS_SCRIPT_REDIRECTS) {
			throw new RelayError("RELAY_REDIRECT_LIMIT", "Apps Script token relay exceeded the redirect limit", "redirect", response.status, redirects)
		}
		const location = response.headers.get("location")
		if (!location) {
			throw new RelayError("RELAY_REDIRECT_INVALID", "Apps Script token relay returned a redirect without a location", "redirect", response.status, redirects)
		}
		let target: URL
		try {
			target = new URL(location, currentUrl)
		} catch {
			throw new RelayError("RELAY_REDIRECT_INVALID", "Apps Script token relay returned an invalid redirect", "redirect", response.status, redirects)
		}
		if (target.protocol !== "https:" || target.hostname !== APPS_SCRIPT_RESPONSE_HOST || target.port) {
			throw new RelayError("RELAY_REDIRECT_BLOCKED", "Apps Script token relay attempted an untrusted redirect", "redirect", response.status, redirects, target.hostname)
		}
		redirects += 1
		currentUrl = target
		try {
			// ContentService answers the signed POST with a redirect to a result resource.
			// Deliberately send a fresh GET: never copy the signed URL, body, or headers cross-origin.
			response = await request(target, { method: "GET", redirect: "manual" })
		} catch {
			throw new RelayError("RELAY_NETWORK_ERROR", "Apps Script token relay redirect request failed", "redirect-request", undefined, redirects, target.hostname)
		}
	}

	let data: Record<string, unknown>
	try {
		data = await limitedResponseJson(response, maxBytes)
	} catch (error) {
		if (error instanceof PayloadTooLargeError) throw error
		throw new RelayError("RELAY_INVALID_RESPONSE", "Apps Script token relay returned invalid JSON", "response", response.status, redirects, currentUrl.hostname)
	}
	if (!response.ok) {
		throw new RelayError(
			"RELAY_HTTP_ERROR",
			`Apps Script token relay returned HTTP ${response.status}`,
			"response",
			response.status,
			redirects,
			currentUrl.hostname,
		)
	}
	if (data.ok !== true) {
		const backendError = readBackendError(data.error, credentials)
		throw new RelayError(backendError.code, backendError.message, "backend-protocol", response.status, redirects, currentUrl.hostname)
	}
	return { ok: true, at: now(), status: response.status, redirects }
}

function readBackendError(value: unknown, credentials: Credentials): { code: string; message: string } {
	const error = value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined
	const rawCode = typeof error?.code === "string" ? error.code : "BACKEND_REJECTED"
	const code = /^[A-Z][A-Z0-9_]{0,63}$/.test(rawCode) ? rawCode : "BACKEND_REJECTED"
	const rawMessage = typeof error?.message === "string" ? error.message : typeof value === "string" ? value : "Apps Script rejected token intake"
	return { code, message: sanitizeBackendMessage(rawMessage, credentials) }
}

function sanitizeBackendMessage(message: string, credentials: Credentials): string {
	let safe = Array.from(message, (character) => {
		const codePoint = character.codePointAt(0)!
		return codePoint <= 31 || codePoint === 127 ? " " : character
	})
		.join("")
		.replace(/https?:\/\/\S+/gi, "[REDACTED_URL]")
		.replace(/\b(signature|timestamp|nonce)\s*[=:]\s*\S+/gi, "$1=[REDACTED]")
		.slice(0, 240)
	for (const credential of [credentials.accessToken, credentials.refreshToken, credentials.idToken]) {
		if (credential) safe = safe.replaceAll(credential, "[REDACTED]")
	}
	const redacted = redactSensitive(safe)
	return typeof redacted === "string" && redacted.trim() ? redacted.trim() : "Apps Script rejected token intake"
}

function relayFailure(error: unknown, at: number): {
	code: string
	message: string
	status: RelayStatus
	log: Record<string, unknown>
} {
	const relayError = error instanceof RelayError ? error : undefined
	const code = relayError?.code ?? (error instanceof PayloadTooLargeError ? "RELAY_RESPONSE_TOO_LARGE" : "RELAY_FAILED")
	const message = relayError?.message ?? (error instanceof PayloadTooLargeError ? "Apps Script token relay response was too large" : "Apps Script token relay failed")
	return {
		code,
		message,
		status: { ok: false, at, status: relayError?.httpStatus, redirects: relayError?.redirects, code, error: message },
		log: {
			message: "Token relay failed",
			code,
			stage: relayError?.stage ?? "unknown",
			status: relayError?.httpStatus,
			redirects: relayError?.redirects,
			host: relayError?.host,
			detail: message,
		},
	}
}

async function readJson(incoming: IncomingMessage, limit: number): Promise<Record<string, unknown>> {
	const text = await readBody(incoming, limit)
	try {
		const value: unknown = text ? JSON.parse(text) : {}
		if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error()
		return value as Record<string, unknown>
	} catch {
		throw new HttpError(400, "Invalid JSON body")
	}
}

async function discardBody(incoming: IncomingMessage, limit: number): Promise<void> {
	await readBody(incoming, limit)
}

async function readBody(incoming: IncomingMessage, limit: number): Promise<string> {
	const declared = Number(incoming.headers["content-length"] ?? 0)
	if (declared > limit) throw new PayloadTooLargeError()
	const chunks: Buffer[] = []
	let size = 0
	for await (const chunk of incoming) {
		const buffer = Buffer.from(chunk)
		size += buffer.length
		if (size > limit) throw new PayloadTooLargeError()
		chunks.push(buffer)
	}
	return Buffer.concat(chunks).toString("utf8")
}

async function limitedResponseJson(response: Response, limit: number): Promise<Record<string, unknown>> {
	const text = await response.text()
	if (Buffer.byteLength(text) > limit) throw new PayloadTooLargeError()
	if (!text) return {}
	try {
		const value: unknown = JSON.parse(text)
		return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {}
	} catch {
		throw new Error("Remote service returned an invalid response")
	}
}

function setSecurityHeaders(response: ServerResponse, config: HelperConfig, incoming: IncomingMessage): void {
	response.setHeader("cache-control", "no-store")
	response.setHeader("x-content-type-options", "nosniff")
	response.setHeader("content-security-policy", "default-src 'none'; frame-ancestors 'none'")
	const origin = incoming.headers.origin
	if (config.trustedOrigin && origin === config.trustedOrigin) response.setHeader("access-control-allow-origin", config.trustedOrigin)
}

function json(response: ServerResponse, status: number, value: unknown): void {
	response.writeHead(status, { "content-type": "application/json; charset=utf-8" })
	response.end(JSON.stringify(value))
}

function html(response: ServerResponse, status: number, message: string): void {
	response.writeHead(status, { "content-type": "text/html; charset=utf-8" })
	response.end(`<!doctype html><meta charset="utf-8"><title>MaveCode Admin Helper</title><p>${escapeHtml(message)}</p>`)
}

function escapeHtml(value: string): string {
	return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!)
}

function stringOrUndefined(value: unknown): string | undefined {
	return typeof value === "string" ? value : undefined
}

function numberOr(value: unknown, fallback: number): number {
	return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function readClaims(token: string | undefined): Pick<Credentials, "accountId" | "email"> {
	try {
		const claims = JSON.parse(Buffer.from(token?.split(".")[1] ?? "", "base64url").toString("utf8")) as Record<string, unknown>
		return { accountId: stringOrUndefined(claims.chatgpt_account_id), email: stringOrUndefined(claims.email) }
	} catch {
		return {}
	}
}

class HttpError extends Error {
	public readonly status: number

	public constructor(status: number, message: string) {
		super(message)
		this.status = status
	}
}

class PayloadTooLargeError extends Error {
	public constructor() {
		super("Payload too large")
	}
}

class RelayError extends Error {
	public constructor(
		public readonly code: string,
		message: string,
		public readonly stage: string,
		public readonly httpStatus?: number,
		public readonly redirects?: number,
		public readonly host?: string,
	) {
		super(message)
	}
}

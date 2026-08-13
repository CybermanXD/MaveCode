const PROTOCOL_VERSION = "mavecode.v1"
export const MAVECODE_REQUEST_TIMEOUT_MS = 30_000
// Apps Script buffers the complete upstream Codex SSE response before replying.
// Keep this below Apps Script's six-minute execution ceiling, but well above the
// former 30s client deadline which produced false failures for valid responses.
export const MAVECODE_CHAT_REQUEST_TIMEOUT_MS = 330_000

export type MaveCodeAction =
	| "health"
	| "provider-status"
	| "auth-config"
	| "auth-code-exchange"
	/** @deprecated Test/migration compatibility only; production disables this backend action. */
	| "session-issue"
	| "session-verify"
	| "session-refresh"
	| "session-revoke"
	| "models"
	| "rate-limits"
	| "chat"

type ProtocolError = { code: string; message: string; retryable: boolean }
type ProtocolResponse<T> =
	| { ok: true; protocolVersion: string; data: T }
	| { ok: false; protocolVersion: string; error: ProtocolError }

export class MaveCodeBackendError extends Error {
	constructor(
		public readonly code: string,
		message: string,
		public readonly retryable = false,
	) {
		super(redactMaveCodeError(message))
		this.name = "MaveCodeBackendError"
	}
}

export function normalizeMaveCodeBackendUrl(value: string): string {
	const trimmed = value.trim()
	if (!trimmed) throw new MaveCodeBackendError("NOT_CONFIGURED", "MaveCode backend URL is not configured")
	let url: URL
	try {
		url = new URL(trimmed)
	} catch {
		throw new MaveCodeBackendError("INVALID_BACKEND_URL", "MaveCode backend URL is invalid")
	}
	if (url.protocol !== "https:") {
		throw new MaveCodeBackendError("INVALID_BACKEND_URL", "MaveCode backend URL must use HTTPS")
	}
	url.hash = ""
	return url.toString()
}

export function redactMaveCodeError(value: unknown): string {
	return String(value instanceof Error ? value.message : value)
		.replace(/(?:Bearer\s+)?(?:mave_ext_|mave_ext_)[A-Za-z0-9._~+\/-]+/gi, "[REDACTED]")
		.replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[REDACTED]")
}

/**
 * Buffered Apps Script transport boundary. Aborting before fetch prevents a request;
 * aborting after dispatch only stops waiting locally because Apps Script UrlFetchApp
 * cannot cancel an already-started provider request. A future streaming transport is
 * intentionally kept separate from this adapter.
 */
export class MaveCodeAppsScriptClient {
	constructor(
		private readonly backendUrl: string,
		private readonly timeoutMsByAction: number | Partial<Record<MaveCodeAction, number>> = {},
	) {}

	private timeoutFor(action: MaveCodeAction): number {
		if (typeof this.timeoutMsByAction === "number") return this.timeoutMsByAction
		return (
			this.timeoutMsByAction[action] ??
			(action === "chat" ? MAVECODE_CHAT_REQUEST_TIMEOUT_MS : MAVECODE_REQUEST_TIMEOUT_MS)
		)
	}

	async action<T>(action: MaveCodeAction, body: Record<string, unknown> = {}, signal?: AbortSignal): Promise<T> {
		if (signal?.aborted) throw new MaveCodeBackendError("REQUEST_ABORTED", "MaveCode request was cancelled")
		const url = normalizeMaveCodeBackendUrl(this.backendUrl)
		const timeoutMs = this.timeoutFor(action)
		if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
			throw new MaveCodeBackendError("INVALID_TIMEOUT", "MaveCode request timeout is invalid")
		}
		const timeout = AbortSignal.timeout(timeoutMs)
		const combined = signal ? AbortSignal.any([signal, timeout]) : timeout

		let response: Response
		try {
			response = await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ action, ...body }),
				signal: combined,
			})
		} catch (error) {
			if (combined.aborted) {
				const code = signal?.aborted ? "REQUEST_ABORTED" : "BACKEND_TIMEOUT"
				throw new MaveCodeBackendError(
					code,
					code === "REQUEST_ABORTED"
						? "MaveCode request was cancelled"
						: `MaveCode backend timed out after ${timeoutMs} ms`,
					true,
				)
			}
			throw new MaveCodeBackendError("BACKEND_UNAVAILABLE", "MaveCode backend is unavailable", true)
		}

		let payload: ProtocolResponse<T>
		try {
			payload = (await response.json()) as ProtocolResponse<T>
		} catch {
			throw new MaveCodeBackendError("INVALID_BACKEND_RESPONSE", "MaveCode backend returned an invalid response")
		}
		if (!payload || payload.protocolVersion !== PROTOCOL_VERSION || typeof payload.ok !== "boolean") {
			throw new MaveCodeBackendError("PROTOCOL_MISMATCH", "MaveCode backend protocol is not supported")
		}
		if (!payload.ok)
			throw new MaveCodeBackendError(payload.error.code, payload.error.message, payload.error.retryable)
		return payload.data
	}
}

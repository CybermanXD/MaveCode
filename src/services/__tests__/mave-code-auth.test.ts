import type { ExtensionContext, SecretStorage } from "vscode"

import {
	clearMaveCodeToken,
	disconnectMaveCode,
	getCachedMaveCodeToken,
	getMaveCodeBaseUrl,
	handleAuthCallback,
	initMaveCodeAuth,
	refreshMaveCodeSession,
	resolveMaveGatewaySessionToken,
	setMaveCodeBackendUrl,
	setMaveCodeToken,
	verifyMaveCodeToken,
} from "../mave-code-auth"

const { mockAction } = vitest.hoisted(() => ({ mockAction: vitest.fn() }))

vitest.mock("../mavecode-appscript-client", () => ({
	MaveCodeAppsScriptClient: class {
		action = mockAction
	},
	MaveCodeBackendError: class extends Error {
		constructor(
			public code: string,
			message: string,
			public retryable = false,
		) {
			super(message)
		}
	},
}))

function createSecretStorage(initial: Record<string, string> = {}): SecretStorage {
	const values = new Map(Object.entries(initial))
	return {
		get: vitest.fn(async (key: string) => values.get(key)),
		store: vitest.fn(async (key: string, value: string) => {
			values.set(key, value)
		}),
		delete: vitest.fn(async (key: string) => {
			values.delete(key)
		}),
		onDidChange: vitest.fn(() => ({ dispose: vitest.fn() })),
	}
}

function contextWith(secrets: SecretStorage): ExtensionContext {
	return { secrets, extension: { packageJSON: { version: "3.76.0" } } } as unknown as ExtensionContext
}

describe("mave-code-auth", () => {
	beforeEach(async () => {
		vitest.clearAllMocks()
		await initMaveCodeAuth(contextWith(createSecretStorage()))
	})

	afterEach(async () => {
		await clearMaveCodeToken()
	})

	it("preloads and verifies a persisted managed session", async () => {
		const secrets = createSecretStorage({
			"mave-code-auth-installation-version": "3.76.0:",
			"mave-code-session-token": "mave_ext_persisted_session_12345",
			"mave-code-session-expiry": String(Date.now() + 3_600_000),
			"mave-code-backend-url": "https://example.invalid/exec",
		})
		mockAction.mockResolvedValueOnce({ valid: true })

		await initMaveCodeAuth(contextWith(secrets))

		expect(getCachedMaveCodeToken()).toBe("mave_ext_persisted_session_12345")
		expect(getMaveCodeBaseUrl()).toBe("https://example.invalid/exec")
		expect(mockAction).toHaveBeenCalledWith("session-verify", {
			sessionToken: "mave_ext_persisted_session_12345",
		})
	})

	it("clears a persisted session when the extension version changes", async () => {
		const secrets = createSecretStorage({
			"mave-code-auth-installation-version": "3.75.0",
			"mave-code-session-token": "mave_ext_previous_version_12345",
			"mave-code-session-expiry": String(Date.now() + 3_600_000),
		})

		await initMaveCodeAuth(contextWith(secrets))

		expect(getCachedMaveCodeToken()).toBe("")
		expect(mockAction).not.toHaveBeenCalled()
		expect(secrets.store).toHaveBeenCalledWith("mave-code-auth-installation-version", "3.76.0:")
	})

	it("clears a definitively invalid persisted session", async () => {
		const { MaveCodeBackendError } = await import("../mavecode-appscript-client")
		const secrets = createSecretStorage({
			"mave-code-session-token": "mave_ext_expired_session_12345",
			"mave-code-session-expiry": String(Date.now() + 3_600_000),
		})
		mockAction.mockRejectedValueOnce(new MaveCodeBackendError("SESSION_EXPIRED", "expired"))

		await initMaveCodeAuth(contextWith(secrets))

		expect(getCachedMaveCodeToken()).toBe("")
	})

	it("preserves a session when verification is temporarily unreachable", async () => {
		const secrets = createSecretStorage({
			"mave-code-session-token": "mave_ext_cached_session_12345",
			"mave-code-session-expiry": String(Date.now() + 3_600_000),
		})
		mockAction.mockRejectedValueOnce(new Error("network unavailable"))

		await initMaveCodeAuth(contextWith(secrets))

		expect(getCachedMaveCodeToken()).toBe("mave_ext_cached_session_12345")
	})

	it("persists the workspace backend URL and managed session", async () => {
		const secrets = createSecretStorage()
		await initMaveCodeAuth(contextWith(secrets))

		await setMaveCodeBackendUrl(" https://example.invalid/exec ")
		await setMaveCodeToken("mave_ext_new_session_12345", 123_456)

		expect(getMaveCodeBaseUrl()).toBe("https://example.invalid/exec")
		expect(secrets.store).toHaveBeenCalledWith("mave-code-backend-url", "https://example.invalid/exec")
		expect(secrets.store).toHaveBeenCalledWith("mave-code-session-token", "mave_ext_new_session_12345")
		expect(secrets.store).toHaveBeenCalledWith("mave-code-session-expiry", "123456")
	})

	it("refreshes managed sessions through the Apps Script client", async () => {
		await setMaveCodeBackendUrl("https://example.invalid/exec")
		await setMaveCodeToken("mave_ext_issued_session_12345")

		mockAction.mockResolvedValueOnce({
			sessionToken: "mave_ext_refreshed_session_12345",
			expiresAt: Date.now() + 120_000,
			claims: { subject: "user", role: "user", issuedAt: 1, expiresAt: 2 },
		})
		await expect(refreshMaveCodeSession()).resolves.toBe(true)
		expect(getCachedMaveCodeToken()).toBe("mave_ext_refreshed_session_12345")
	})

	it("rejects callbacks without a matching PKCE transaction", async () => {
		await expect(handleAuthCallback("mave_code_abcdefghijklmnopqrstuvwxyz", "state")).resolves.toBe(false)
	})

	it("exchanges a matching one-time PKCE transaction and clears transaction secrets", async () => {
		const state = "s".repeat(43)
		const verifier = "v".repeat(43)
		const callbackUri = "vscode://MaveCode.mave-code/auth-callback"
		const secrets = createSecretStorage({
			"mave-code-auth-state": state,
			"mave-code-auth-verifier": verifier,
			"mave-code-auth-callback": callbackUri,
		})
		await initMaveCodeAuth(contextWith(secrets))
		mockAction.mockResolvedValueOnce({
			sessionToken: "mave_ext_exchanged_session_12345",
			expiresAt: Date.now() + 120_000,
			claims: { subject: "allowed@example.invalid", role: "user", issuedAt: 1, expiresAt: 2 },
		})

		await expect(handleAuthCallback("mave_code_abcdefghijklmnopqrstuvwxyz", state)).resolves.toBe(true)
		expect(mockAction).toHaveBeenCalledWith("auth-code-exchange", {
			authorizationCode: "mave_code_abcdefghijklmnopqrstuvwxyz",
			state,
			codeVerifier: verifier,
			callbackUri,
		})
		expect(getCachedMaveCodeToken()).toBe("mave_ext_exchanged_session_12345")
		expect(secrets.delete).toHaveBeenCalledWith("mave-code-auth-state")
		expect(secrets.delete).toHaveBeenCalledWith("mave-code-auth-verifier")
		expect(secrets.delete).toHaveBeenCalledWith("mave-code-auth-callback")
	})

	it("rejects a mismatched state and consumes the local transaction", async () => {
		const secrets = createSecretStorage({
			"mave-code-auth-state": "s".repeat(43),
			"mave-code-auth-verifier": "v".repeat(43),
			"mave-code-auth-callback": "vscode://MaveCode.mave-code/auth-callback",
		})
		await initMaveCodeAuth(contextWith(secrets))

		await expect(handleAuthCallback("mave_code_abcdefghijklmnopqrstuvwxyz", "x".repeat(43))).resolves.toBe(false)
		expect(mockAction).not.toHaveBeenCalled()
		expect(secrets.delete).toHaveBeenCalledTimes(3)
	})

	it("classifies verification failures", async () => {
		const { MaveCodeBackendError } = await import("../mavecode-appscript-client")
		await setMaveCodeToken("mave_ext_active_session_12345")
		mockAction.mockResolvedValueOnce({ valid: true })
		await expect(verifyMaveCodeToken()).resolves.toBe("valid")

		mockAction.mockRejectedValueOnce(new MaveCodeBackendError("UNAUTHENTICATED", "invalid"))
		await expect(verifyMaveCodeToken()).resolves.toBe("invalid")

		mockAction.mockRejectedValueOnce(new Error("network"))
		await expect(verifyMaveCodeToken()).resolves.toBe("unreachable")
	})

	it("prefers the managed cache and retains the legacy profile fallback", async () => {
		expect(resolveMaveGatewaySessionToken("legacy-profile-token")).toBe("legacy-profile-token")
		await setMaveCodeToken("mave_ext_cached_session_12345")
		expect(resolveMaveGatewaySessionToken("legacy-profile-token")).toBe("mave_ext_cached_session_12345")
	})

	it("revokes the active session and always clears local auth", async () => {
		await setMaveCodeToken("mave_ext_active_session_12345")
		mockAction.mockRejectedValueOnce(new Error("backend unavailable"))

		await disconnectMaveCode()

		expect(mockAction).toHaveBeenCalledWith("session-revoke", {
			sessionToken: "mave_ext_active_session_12345",
		})
		expect(getCachedMaveCodeToken()).toBe("")
	})
})

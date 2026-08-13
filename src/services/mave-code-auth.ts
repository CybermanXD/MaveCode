import * as vscode from "vscode"
import { createHash, randomBytes } from "node:crypto"
import { stat } from "node:fs/promises"

import { MaveCodeAppsScriptClient, MaveCodeBackendError } from "./mavecode-appscript-client"

const TOKEN_KEY = "mave-code-session-token"
const EXPIRY_KEY = "mave-code-session-expiry"
const BACKEND_URL_KEY = "mave-code-backend-url"
const AUTH_STATE_KEY = "mave-code-auth-state"
const AUTH_VERIFIER_KEY = "mave-code-auth-verifier"
const AUTH_CALLBACK_KEY = "mave-code-auth-callback"
const AUTH_INSTALLATION_VERSION_KEY = "mave-code-auth-installation-version"
const DEFAULT_BACKEND_URL = process.env.MAVE_CODE_BACKEND_URL || ""
const DEFAULT_AUTH_PAGE_URL = process.env.MAVE_CODE_AUTH_PAGE_URL || ""

let secrets: vscode.SecretStorage | undefined
let cachedToken = ""
let cachedExpiry = 0
let cachedBackendUrl = DEFAULT_BACKEND_URL
let signInLaunch: Promise<boolean> | undefined

type SessionData = {
	sessionToken: string
	expiresAt: number
	claims: { subject: string; role: string; issuedAt: number; expiresAt: number }
}

export async function initMaveCodeAuth(context: vscode.ExtensionContext): Promise<void> {
	secrets = context.secrets
	if (!secrets) return
	const currentVersion = String(context.extension?.packageJSON?.version ?? "")
	const installationModifiedAt = context.extensionPath
		? await stat(context.extensionPath).then((value) => String(value.mtimeMs)).catch(() => "")
		: ""
	const currentInstallation = `${currentVersion}:${installationModifiedAt}`
	const previousVersion = await secrets.get(AUTH_INSTALLATION_VERSION_KEY)
	if (!previousVersion || previousVersion !== currentInstallation) {
		// The managed product requires explicit authentication after every fresh
		// install or extension update. VS Code normally retains Secret Storage when
		// an extension is reinstalled, so consume the old session locally here.
		await Promise.all([
			secrets.delete(TOKEN_KEY),
			secrets.delete(EXPIRY_KEY),
			secrets.delete(AUTH_STATE_KEY),
			secrets.delete(AUTH_VERIFIER_KEY),
			secrets.delete(AUTH_CALLBACK_KEY),
			secrets.store(AUTH_INSTALLATION_VERSION_KEY, currentInstallation),
		])
	}
	cachedToken = (await secrets.get(TOKEN_KEY)) ?? ""
	cachedExpiry = Number((await secrets.get(EXPIRY_KEY)) ?? 0)
	const storedBackendUrl = (await secrets.get(BACKEND_URL_KEY))?.trim()
	cachedBackendUrl =
		storedBackendUrl && /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec\/?$/i.test(storedBackendUrl)
			? storedBackendUrl
			: DEFAULT_BACKEND_URL
	if (cachedBackendUrl && storedBackendUrl !== cachedBackendUrl) {
		await secrets.store(BACKEND_URL_KEY, cachedBackendUrl)
	}
	if (cachedToken) {
		const result = await verifyMaveCodeToken()
		if (result === "invalid") await clearMaveCodeToken()
		else if (result === "valid" && cachedExpiry <= Date.now() + 60_000) await refreshMaveCodeSession()
	}
}

export function getMaveCodeBaseUrl(): string {
	return cachedBackendUrl
}

export async function setMaveCodeBackendUrl(url: string): Promise<void> {
	cachedBackendUrl = url.trim()
	if (secrets) await secrets.store(BACKEND_URL_KEY, cachedBackendUrl)
}

export function getCachedMaveCodeToken(): string {
	return cachedToken
}

/** Migration-only fallback for profiles created before Apps Script sessions. */
export function resolveMaveGatewaySessionToken(legacyProfileToken?: string): string | undefined {
	return cachedToken || legacyProfileToken || undefined
}

export async function getMaveCodeToken(): Promise<string | undefined> {
	return cachedToken || undefined
}

export async function setMaveCodeToken(token: string, expiresAt = cachedExpiry): Promise<void> {
	cachedToken = token
	cachedExpiry = expiresAt
	if (!secrets) return
	await secrets.store(TOKEN_KEY, token)
	await secrets.store(EXPIRY_KEY, String(expiresAt))
}

export async function clearMaveCodeToken(): Promise<void> {
	cachedToken = ""
	cachedExpiry = 0
	await secrets?.delete(TOKEN_KEY)
	await secrets?.delete(EXPIRY_KEY)
}

function client(): MaveCodeAppsScriptClient {
	return new MaveCodeAppsScriptClient(cachedBackendUrl)
}

function randomOpaque(bytes = 32): string {
	return randomBytes(bytes).toString("base64url")
}

async function sha256Base64Url(value: string): Promise<string> {
	return createHash("sha256").update(value).digest("base64url")
}

export async function startMaveCodeSignIn(): Promise<boolean> {
	if (cachedToken) return true
	if (signInLaunch) return signInLaunch
	signInLaunch = launchMaveCodeSignIn()
	try {
		return await signInLaunch
	} finally {
		// Coalesce only calls that overlap while openExternal is in flight. Once the
		// browser launch completes, every manual retry must create a fresh PKCE
		// transaction and URL; retaining a completed promise makes the button appear
		// successful without reopening a usable sign-in page.
		signInLaunch = undefined
	}
}

async function launchMaveCodeSignIn(): Promise<boolean> {
	const url = await createMaveCodeSignInUrl()
	if (!url) return false
	return vscode.env.openExternal(vscode.Uri.parse(url))
}

export async function createMaveCodeSignInUrl(): Promise<string | undefined> {
	if (!secrets || !cachedBackendUrl || !DEFAULT_AUTH_PAGE_URL) {
		void vscode.window.showErrorMessage("MaveCode sign-in is not configured. Set the managed backend and authentication page URLs.")
		return undefined
	}
	const state = randomOpaque()
	const verifier = randomOpaque(48)
	const callbackUri = `${vscode.env.uriScheme}://MaveCode.mave-code/auth-callback`
	await Promise.all([secrets.store(AUTH_STATE_KEY, state), secrets.store(AUTH_VERIFIER_KEY, verifier), secrets.store(AUTH_CALLBACK_KEY, callbackUri)])
	const url = new URL(DEFAULT_AUTH_PAGE_URL)
	url.searchParams.set("state", state)
	url.searchParams.set("code_challenge", await sha256Base64Url(verifier))
	url.searchParams.set("callback_uri", callbackUri)
	return url.toString()
}

/** @deprecated Google OAuth + PKCE is required; retained only for source compatibility. */
export async function issueMaveCodeSession(): Promise<SessionData> {
	throw new MaveCodeBackendError("GOOGLE_SIGN_IN_REQUIRED", "Start Google sign-in before requesting a MaveCode session")
}

export async function handleAuthCallback(code: string, state = ""): Promise<boolean> {
	signInLaunch = undefined
	if (!secrets || !/^mave_code_[A-Za-z0-9_-]{20,}$/.test(code)) return false
	const [expectedState, verifier, callbackUri] = await Promise.all([secrets.get(AUTH_STATE_KEY), secrets.get(AUTH_VERIFIER_KEY), secrets.get(AUTH_CALLBACK_KEY)])
	await Promise.all([secrets.delete(AUTH_STATE_KEY), secrets.delete(AUTH_VERIFIER_KEY), secrets.delete(AUTH_CALLBACK_KEY)])
	if (!expectedState || expectedState !== state || !verifier || !callbackUri) return false
	try {
		const session = await client().action<SessionData>("auth-code-exchange", { authorizationCode: code, state, codeVerifier: verifier, callbackUri })
		await setMaveCodeToken(session.sessionToken, session.expiresAt)
		return true
	} catch (error) {
		const code = error instanceof MaveCodeBackendError ? error.code : "AUTH_EXCHANGE_FAILED"
		console.error(`[MaveCode Auth] Authorization exchange failed: ${code}`)
		await clearMaveCodeToken()
		return false
	}
}

export async function verifyMaveCodeToken(): Promise<"valid" | "invalid" | "unreachable"> {
	if (!cachedToken) return "invalid"
	try {
		await client().action("session-verify", { sessionToken: cachedToken })
		return "valid"
	} catch (error) {
		if (
			error instanceof MaveCodeBackendError &&
			["SESSION_EXPIRED", "UNAUTHENTICATED", "FORBIDDEN"].includes(error.code)
		)
			return "invalid"
		return "unreachable"
	}
}

export async function refreshMaveCodeSession(): Promise<boolean> {
	if (!cachedToken) return false
	try {
		const session = await client().action<SessionData>("session-refresh", { sessionToken: cachedToken })
		await setMaveCodeToken(session.sessionToken, session.expiresAt)
		return true
	} catch (error) {
		if (
			error instanceof MaveCodeBackendError &&
			["SESSION_EXPIRED", "UNAUTHENTICATED", "FORBIDDEN"].includes(error.code)
		)
			await clearMaveCodeToken()
		return false
	}
}

export async function isMaveCodeAuthenticated(): Promise<boolean> {
	return Boolean(cachedToken)
}

export async function disconnectMaveCode(): Promise<void> {
	if (cachedToken) {
		try {
			await client().action("session-revoke", { sessionToken: cachedToken })
		} catch {
			// Local sign-out must succeed even when the managed backend is unavailable.
		}
	}
	await clearMaveCodeToken()
}

// Retained as no-op compatibility exports while inherited profile metadata is migrated.
export function getCachedMaveCodeUserInfo(): { name?: string; email?: string; image?: string } {
	return {}
}
export async function setMaveCodeUserInfo(_info?: {
	name?: string | null
	email?: string | null
	image?: string | null
}): Promise<void> {}
export async function clearMaveCodeUserInfo(): Promise<void> {}

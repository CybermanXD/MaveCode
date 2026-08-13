import { readFileSync } from "node:fs"

export interface HelperConfig {
	host: "127.0.0.1"
	port: number
	clientId: string
	redirectUri: string
	appsScriptUrl: string
	intakeSecret: string
	stateTtlMs: number
	maxBodyBytes: number
	trustedOrigin?: string
	authorizationEndpoint: string
	tokenEndpoint: string
}

export const CODEX_REDIRECT_URI = "http://localhost:1455/auth/callback"

type Environment = Record<string, string | undefined>

export function loadConfig(environment: Environment = process.env): HelperConfig {
	const fileConfig = readLocalConfig(environment.MAVECODE_CONFIG_PATH)
	const value = (name: string): string | undefined => environment[name] || fileConfig[name]
	const clientId = required(value("MAVECODE_CODEX_CLIENT_ID"), "MAVECODE_CODEX_CLIENT_ID")
	const redirectUri = validateRedirect(required(value("MAVECODE_CODEX_REDIRECT_URI"), "MAVECODE_CODEX_REDIRECT_URI"))
	const appsScriptUrl = validateBackendUrl(required(value("MAVECODE_APPS_SCRIPT_URL"), "MAVECODE_APPS_SCRIPT_URL"))
	const intakeSecret = required(value("MAVECODE_INTAKE_SECRET"), "MAVECODE_INTAKE_SECRET")
	if (Buffer.byteLength(intakeSecret) < 32) throw new Error("MAVECODE_INTAKE_SECRET must contain at least 32 bytes")
	const trustedOrigin = value("MAVECODE_TRUSTED_ORIGIN")
	if (trustedOrigin) validateOrigin(trustedOrigin)
	return {
		host: "127.0.0.1",
		port: integer(value("MAVECODE_HELPER_PORT"), 4567, 0, 65535),
		clientId,
		redirectUri,
		appsScriptUrl,
		intakeSecret,
		stateTtlMs: integer(value("MAVECODE_STATE_TTL_MS"), 600_000, 1_000, 900_000),
		maxBodyBytes: integer(value("MAVECODE_MAX_BODY_BYTES"), 16_384, 1_024, 1_048_576),
		trustedOrigin,
		authorizationEndpoint: "https://auth.openai.com/oauth/authorize",
		tokenEndpoint: "https://auth.openai.com/oauth/token",
	}
}

function readLocalConfig(path: string | undefined): Environment {
	if (!path) return {}
	try {
		const parsed: unknown = JSON.parse(readFileSync(path, "utf8"))
		if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("must be a JSON object")
		return parsed as Environment
	} catch (error) {
		throw new Error(`Unable to load MAVECODE_CONFIG_PATH: ${error instanceof Error ? error.message : String(error)}`)
	}
}

function required(value: string | undefined, name: string): string {
	if (!value?.trim()) throw new Error(`Missing required configuration: ${name}`)
	return value.trim()
}

function integer(value: string | undefined, fallback: number, min: number, max: number): number {
	const result = value === undefined ? fallback : Number(value)
	if (!Number.isInteger(result) || result < min || result > max) throw new Error(`Invalid numeric configuration: ${value}`)
	return result
}

export function validateBackendUrl(value: string): string {
	let url: URL
	try {
		url = new URL(value)
	} catch {
		throw new Error("MAVECODE_APPS_SCRIPT_URL must be a valid URL")
	}
	if (
		url.protocol !== "https:" ||
		url.hostname !== "script.google.com" ||
		!/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname) ||
		url.username ||
		url.password ||
		url.search ||
		url.hash
	) {
		throw new Error("MAVECODE_APPS_SCRIPT_URL must exactly match https://script.google.com/macros/s/<deployment-id>/exec")
	}
	return url.href
}

export function validateRedirect(value: string): string {
	let url: URL
	try {
		url = new URL(value)
	} catch {
		throw new Error(`MAVECODE_CODEX_REDIRECT_URI must exactly match ${CODEX_REDIRECT_URI}`)
	}
	if (
		value !== CODEX_REDIRECT_URI ||
		url.protocol !== "http:" ||
		url.hostname !== "localhost" ||
		url.port !== "1455" ||
		url.pathname !== "/auth/callback" ||
		url.username ||
		url.password ||
		url.search ||
		url.hash
	) {
		throw new Error(`MAVECODE_CODEX_REDIRECT_URI must exactly match ${CODEX_REDIRECT_URI}`)
	}
	return CODEX_REDIRECT_URI
}

function validateOrigin(value: string): void {
	const url = new URL(value)
	if (url.origin !== value || !["http:", "https:"].includes(url.protocol)) throw new Error("MAVECODE_TRUSTED_ORIGIN must be an exact origin")
}

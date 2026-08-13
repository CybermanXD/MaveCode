import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

export interface PkceState {
	state: string
	verifier: string
	challenge: string
	createdAt: number
}

export function createPkceState(now = Date.now()): PkceState {
	const verifier = randomBytes(48).toString("base64url")
	return {
		state: randomBytes(32).toString("base64url"),
		verifier,
		challenge: createHash("sha256").update(verifier).digest("base64url"),
		createdAt: now,
	}
}

export function validateState(expected: PkceState | undefined, state: string | null, now: number, ttlMs: number): void {
	if (!expected || !state || !safeEqual(expected.state, state)) throw new Error("Invalid OAuth state")
	if (now - expected.createdAt > ttlMs) throw new Error("OAuth state expired")
}

export function signPayload(secret: string, timestamp: string, nonce: string, payload: string): string {
	const digest = createHash("sha256").update(payload).digest("hex")
	return createHmac("sha256", secret).update(`${timestamp}.${nonce}.${digest}`).digest("base64url")
}

export function verifySignature(
	secret: string,
	timestamp: string,
	nonce: string,
	payload: string,
	signature: string,
): boolean {
	return safeEqual(signPayload(secret, timestamp, nonce, payload), signature)
}

export function createNonce(): string {
	return randomBytes(24).toString("base64url")
}

function safeEqual(left: string, right: string): boolean {
	const a = Buffer.from(left)
	const b = Buffer.from(right)
	return a.length === b.length && timingSafeEqual(a, b)
}

const SENSITIVE_KEY = /^(access_?token|refresh_?token|id_?token|authorization|code|code_?verifier|client_?secret|intake_?secret|shared_?secret)$/i
const BEARER = /Bearer\s+[A-Za-z0-9._~+/=-]+/gi
const JWT = /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g

export function redactSensitive(value: unknown): unknown {
	if (typeof value === "string") return value.replace(BEARER, "Bearer [REDACTED]").replace(JWT, "[REDACTED]")
	if (Array.isArray(value)) return value.map(redactSensitive)
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([key, item]) => [key, SENSITIVE_KEY.test(key) ? "[REDACTED]" : redactSensitive(item)]),
		)
	}
	return value
}

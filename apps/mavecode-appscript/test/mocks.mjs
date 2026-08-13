import { createHash, createHmac, randomUUID } from "node:crypto"

export function createMocks(overrides = {}) {
	const values = new Map(Object.entries(overrides.properties || {}))
	const cacheValues = new Map()
	const logs = []
	let now = overrides.now ?? 1_800_000_000_000
	const properties = {
		getProperty: (key) => values.get(key) ?? null,
		setProperty: (key, value) => values.set(key, String(value)),
		deleteProperty: (key) => values.delete(key),
		getProperties: () => Object.fromEntries(values),
	}
	const cache = {
		get: (key) => cacheValues.get(key)?.value ?? null,
		put: (key, value, ttl) => cacheValues.set(key, { value: String(value), ttl }),
		remove: (key) => cacheValues.delete(key),
	}
	const lock = {
		locked: false,
		tryLock() { if (this.locked) return false; this.locked = true; return true },
		releaseLock() { this.locked = false },
	}
	const crypto = {
		DigestAlgorithm: { SHA_256: "sha256" },
		Charset: { UTF_8: "utf8" },
		computeDigest: (_algorithm, value) => [...createHash("sha256").update(value).digest()].map(signed),
		computeHmacSha256Signature: (value, secret) => [...createHmac("sha256", secret).update(value).digest()].map(signed),
		base64EncodeWebSafe: (value) => Buffer.from(Array.isArray(value) ? value.map(unsigned) : value).toString("base64url"),
		getUuid: randomUUID,
	}
	return {
		properties,
		cache,
		lock,
		crypto,
		identity: { getEmail: () => overrides.email ?? "user@example.invalid" },
		fetch: overrides.fetch ?? (() => { throw new Error("Unexpected fetch") }),
		log: overrides.log ?? ((event, details) => logs.push({ event, details })),
		now: () => now,
		setNow: (value) => { now = value },
		values,
		cacheValues,
		logs,
	}
}

function signed(value) { return value > 127 ? value - 256 : value }
function unsigned(value) { return value < 0 ? value + 256 : value }

export function event(body, parameters = {}) {
	return { postData: { contents: JSON.stringify(body) }, parameter: parameters }
}

export function signIntake(secret, timestamp, nonce, rawBody) {
	const digest = createHash("sha256").update(rawBody).digest("hex")
	return createHmac("sha256", secret).update(`${timestamp}.${nonce}.${digest}`).digest("base64url")
}

export function configuredProperties(extra = {}) {
	return {
		MAVECODE_INTAKE_SECRET: "unit-test-intake-value-not-a-deployment-secret",
		MAVECODE_ALLOWED_USERS: "user@example.invalid,second@example.invalid",
		MAVECODE_ALLOWED_DOMAINS: "allowed.example.invalid",
		MAVECODE_ADMIN_USERS: "admin@example.invalid",
		MAVECODE_GOOGLE_CLIENT_ID: "test-client.apps.googleusercontent.com",
		MAVECODE_EXTENSION_CALLBACK_URI: "vscode://MaveCode.mave-code/auth-callback",
		MAVECODE_ENABLE_LEGACY_SESSION_ISSUE: "true",
		MAVECODE_MODEL_ALLOWLIST: "codex-test-model",
		...extra,
	}
}

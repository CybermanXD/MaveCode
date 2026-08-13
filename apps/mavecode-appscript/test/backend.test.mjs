import assert from "node:assert/strict"
import test from "node:test"
import Backend from "../src/core.js"
import { configuredProperties, createMocks, event, signIntake } from "./mocks.mjs"

const intakeSecret = "unit-test-intake-value-not-a-deployment-secret"

test("health is public and reports readiness without credentials", () => {
	const deps = createMocks({ properties: configuredProperties() })
	const response = Backend.handle("GET", { parameter: { action: "health" } }, deps)
	assert.equal(response.status, 200)
	assert.equal(response.body.data.ready, false)
	assert.deepEqual(response.body.data.provider, { provider: "codex", connected: false, credentialState: "missing" })
})

test("admin provider probe distinguishes stored credentials from upstream acceptance without leaking secrets", () => {
	const deps = createMocks({
		properties: configuredProperties(),
		email: "admin@example.invalid",
		fetch: (_url, options) => {
			assert.equal(options.headers.Authorization, "Bearer provider-private-value")
			return { getResponseCode: () => 401, getContentText: () => JSON.stringify({ access_token: "must-not-escape", error: { code: "token_expired", message: "Bearer must-not-escape" } }) }
		},
	})
	deps.properties.setProperty("provider.codex", JSON.stringify({ accessToken: "provider-private-value", expiresAt: deps.now() + 60_000, updatedAt: deps.now() }))
	const status = Backend.handle("POST", event({ action: "provider-status" }), deps)
	assert.equal(status.body.data.credentialState, "stored")
	const response = Backend.handle("POST", event({ action: "provider-probe" }), deps)
	assert.deepEqual(response.body.data, {
		provider: "codex", credentialState: "stored", accepted: false, reachable: true,
		checkedAt: deps.now(), upstreamStatus: 401,
		upstreamError: { code: "token_expired", message: "Provider token is expired." },
	})
	assert.equal(JSON.stringify(response.body).includes("private-value"), false)
	assert.equal(JSON.stringify(response.body).includes("must-not-escape"), false)
})

test("provider probe is admin-only and suppresses non-allowlisted upstream errors", () => {
	const fetch = () => ({ getResponseCode: () => 400, getContentText: () => JSON.stringify({ error: { code: "novel_error", message: "secret detail" } }) })
	const userDeps = createMocks({ properties: configuredProperties(), email: "user@example.invalid", fetch })
	userDeps.properties.setProperty("provider.codex", JSON.stringify({ accessToken: "private", expiresAt: userDeps.now() + 60_000, updatedAt: userDeps.now() }))
	assert.equal(Backend.handle("POST", event({ action: "provider-probe" }), userDeps).status, 403)
	const adminDeps = createMocks({ properties: configuredProperties(), email: "admin@example.invalid", fetch })
	adminDeps.properties.setProperty("provider.codex", JSON.stringify({ accessToken: "private", expiresAt: adminDeps.now() + 60_000, updatedAt: adminDeps.now() }))
	const response = Backend.handle("POST", event({ action: "provider-probe" }), adminDeps)
	assert.equal(Object.hasOwn(response.body.data, "upstreamError"), false)
	assert.equal(JSON.stringify(response.body).includes("secret detail"), false)
})

test("health readiness uses the managed Codex catalog and connected provider", () => {
	const deps = createMocks({ properties: configuredProperties() })
	deps.properties.setProperty("provider.codex", JSON.stringify({ accessToken: "private", expiresAt: deps.now() + 60_000, updatedAt: deps.now() }))
	assert.equal(Backend.handle("GET", { parameter: { action: "health" } }, deps).body.data.ready, true)
	deps.properties.deleteProperty("MAVECODE_MODEL_ALLOWLIST")
	assert.equal(Backend.handle("GET", { parameter: { action: "health" } }, deps).body.data.ready, true)
})

test("signed intake, status, and admin revocation never expose credentials", () => {
	const deps = createMocks({ properties: configuredProperties(), email: "admin@example.invalid" })
	const body = {
		action: "provider-token-intake",
		provider: "codex",
		credentials: { accessToken: "provider-access-value", refreshToken: "provider-refresh-value", expiresAt: deps.now() + 60_000 },
	}
	const raw = JSON.stringify(body)
	const timestamp = String(deps.now())
	const nonce = "nonce_value_1234567890"
	const response = Backend.handle("POST", { postData: { contents: raw }, parameter: { timestamp, nonce, signature: signIntake(intakeSecret, timestamp, nonce, raw) } }, deps)
	assert.equal(response.status, 200)
	assert.equal(JSON.stringify(response.body).includes("provider-access-value"), false)
	assert.equal(Backend.handle("POST", event({ action: "provider-status" }), deps).body.data.connected, true)
	assert.equal(Backend.handle("POST", event({ action: "provider-revoke" }), deps).body.data.revoked, true)
	assert.equal(deps.properties.getProperty("provider.codex"), null)
})

test("intake rejects invalid signatures, stale timestamps, replay, and oversized input", () => {
	const deps = createMocks({ properties: configuredProperties({ MAVECODE_MAX_REQUEST_BYTES: "4096" }) })
	const body = { action: "provider-token-intake", provider: "codex", credentials: { accessToken: "value", expiresAt: deps.now() + 1000 } }
	const raw = JSON.stringify(body)
	const nonce = "nonce_value_1234567890"
	let timestamp = String(deps.now())
	assert.equal(Backend.handle("POST", { postData: { contents: raw }, parameter: { timestamp, nonce, signature: "wrong" } }, deps).body.error.code, "INVALID_SIGNATURE")
	const signature = signIntake(intakeSecret, timestamp, nonce, raw)
	assert.equal(Backend.handle("POST", { postData: { contents: raw }, parameter: { timestamp, nonce, signature } }, deps).status, 200)
	assert.equal(Backend.handle("POST", { postData: { contents: raw }, parameter: { timestamp, nonce, signature } }, deps).body.error.code, "REPLAY_DETECTED")
	timestamp = String(deps.now() - 600_000)
	assert.equal(Backend.handle("POST", { postData: { contents: raw }, parameter: { timestamp, nonce: `${nonce}x`, signature: signIntake(intakeSecret, timestamp, `${nonce}x`, raw) } }, deps).body.error.code, "STALE_SIGNATURE")
	const huge = JSON.stringify({ ...body, padding: "x".repeat(5000) })
	assert.equal(Backend.handle("POST", { postData: { contents: huge }, parameter: { timestamp: String(deps.now()), nonce: `${nonce}y`, signature: signIntake(intakeSecret, String(deps.now()), `${nonce}y`, huge) } }, deps).body.error.code, "PAYLOAD_TOO_LARGE")
})

test("unknown actions and invalid JSON are normalized", () => {
	const deps = createMocks({ properties: configuredProperties() })
	assert.equal(Backend.handle("POST", event({ action: "nope" }), deps).status, 404)
	const invalid = Backend.handle("POST", { postData: { contents: "{" }, parameter: {} }, deps)
	assert.deepEqual(invalid.body.error, { code: "INVALID_REQUEST", message: "Invalid JSON body", retryable: false })
})

import assert from "node:assert/strict"
import test from "node:test"
import Backend from "../src/core.js"
import { configuredProperties, createMocks, event } from "./mocks.mjs"

test("allowlisted user can issue, verify, refresh, and revoke a short session", () => {
	const deps = createMocks({ properties: configuredProperties(), email: "user@example.invalid" })
	const issued = Backend.handle("POST", event({ action: "session-issue" }), deps)
	assert.equal(issued.status, 200)
	assert.equal(issued.body.data.claims.role, "user")
	assert.match(issued.body.data.sessionToken, /^mave_ext_/)
	assert.equal(JSON.stringify(deps.properties.getProperties()).includes("provider-access-value"), false)
	const token = issued.body.data.sessionToken
	assert.equal(Backend.handle("POST", event({ action: "session-verify", sessionToken: token }), deps).body.data.valid, true)
	const refreshed = Backend.handle("POST", event({ action: "session-refresh", sessionToken: token }), deps)
	assert.equal(refreshed.status, 200)
	assert.notEqual(refreshed.body.data.sessionToken, token)
	assert.equal(Backend.handle("POST", event({ action: "session-verify", sessionToken: token }), deps).status, 401)
	const newToken = refreshed.body.data.sessionToken
	assert.equal(Backend.handle("POST", event({ action: "session-revoke", sessionToken: newToken }), deps).status, 200)
	assert.equal(Backend.handle("POST", event({ action: "session-verify", sessionToken: newToken }), deps).status, 401)
})

test("non-allowlisted users cannot issue and bearer sessions do not depend on Apps Script active identity", () => {
	const deps = createMocks({ properties: configuredProperties(), email: "user@example.invalid" })
	const token = Backend.handle("POST", event({ action: "session-issue" }), deps).body.data.sessionToken
	deps.identity.getEmail = () => "second@example.invalid"
	assert.equal(Backend.handle("POST", event({ action: "session-verify", sessionToken: token }), deps).body.data.valid, true)
	deps.identity.getEmail = () => "outsider@example.invalid"
	assert.equal(Backend.handle("POST", event({ action: "session-issue" }), deps).status, 403)
})

test("expired sessions fail verification and refresh lifetime is independently enforced", () => {
	const deps = createMocks({ properties: configuredProperties({ MAVECODE_SESSION_TTL_MS: "100", MAVECODE_REFRESH_TTL_MS: "200" }), email: "user@example.invalid" })
	const issued = Backend.handle("POST", event({ action: "session-issue" }), deps).body.data
	deps.setNow(deps.now() + 101)
	assert.equal(Backend.handle("POST", event({ action: "session-verify", sessionToken: issued.sessionToken }), deps).body.error.code, "SESSION_EXPIRED")
	assert.equal(Backend.handle("POST", event({ action: "session-refresh", sessionToken: issued.sessionToken }), deps).status, 200)
	const second = Backend.handle("POST", event({ action: "session-issue" }), deps).body.data
	deps.setNow(deps.now() + 201)
	assert.equal(Backend.handle("POST", event({ action: "session-refresh", sessionToken: second.sessionToken }), deps).body.error.code, "SESSION_EXPIRED")
})

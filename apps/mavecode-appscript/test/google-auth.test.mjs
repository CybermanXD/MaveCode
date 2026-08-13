import assert from "node:assert/strict"
import { createHash } from "node:crypto"
import test from "node:test"

import backend from "../src/core.js"
import { configuredProperties, createMocks, event } from "./mocks.mjs"

const state = "s".repeat(43)
const verifier = "v".repeat(43)
const challenge = createHash("sha256").update(verifier).digest("base64url")
const callbackUri = "vscode://MaveCode.mave-code/auth-callback"
const idToken = `eyJ.${"a".repeat(120)}.signature`

function googleFetch(email, overrides = {}) {
	return () => ({
		getResponseCode: () => overrides.status ?? 200,
		getContentText: () => JSON.stringify({
			aud: "test-client.apps.googleusercontent.com",
			iss: "https://accounts.google.com",
			exp: "1900000000",
			email,
			email_verified: "true",
			...overrides.profile,
		}),
	})
}

function complete(deps) {
	return backend.handle("POST", event({ action: "auth-google-complete", idToken, state, codeChallenge: challenge, callbackUri }), deps)
}

test("verified explicitly allowed Google user exchanges a PKCE code once", () => {
	const deps = createMocks({ properties: configuredProperties(), fetch: googleFetch("user@example.invalid") })
	const authorized = complete(deps)
	assert.equal(authorized.status, 200)
	const authorizationCode = authorized.body.data.authorizationCode
	const exchanged = backend.handle("POST", event({ action: "auth-code-exchange", authorizationCode, state, codeVerifier: verifier, callbackUri }), deps)
	assert.equal(exchanged.status, 200)
	assert.match(exchanged.body.data.sessionToken, /^mave_ext_/)
	assert.equal(exchanged.body.data.claims.subject, "user@example.invalid")
	const replay = backend.handle("POST", event({ action: "auth-code-exchange", authorizationCode, state, codeVerifier: verifier, callbackUri }), deps)
	assert.equal(replay.body.error.code, "AUTH_CODE_EXPIRED")
})

test("verified user from an allowed domain is accepted", () => {
	const deps = createMocks({ properties: configuredProperties(), fetch: googleFetch("person@allowed.example.invalid") })
	assert.equal(complete(deps).status, 200)
})

test("non-allowlisted Google account is denied", () => {
	const deps = createMocks({ properties: configuredProperties(), fetch: googleFetch("outsider@blocked.example.invalid") })
	const response = complete(deps)
	assert.equal(response.status, 403)
	assert.equal(response.body.error.code, "FORBIDDEN")
})

test("wrong Google audience and PKCE verifier are denied", () => {
	const wrongAudience = createMocks({ properties: configuredProperties(), fetch: googleFetch("user@example.invalid", { profile: { aud: "other-client" } }) })
	assert.equal(complete(wrongAudience).body.error.code, "UNAUTHENTICATED")

	const deps = createMocks({ properties: configuredProperties(), fetch: googleFetch("user@example.invalid") })
	const code = complete(deps).body.data.authorizationCode
	const response = backend.handle("POST", event({ action: "auth-code-exchange", authorizationCode: code, state, codeVerifier: "x".repeat(43), callbackUri }), deps)
	assert.equal(response.body.error.code, "INVALID_GRANT")
})

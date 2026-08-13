import { createHash } from "node:crypto"
import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { createPkceState, redactSensitive, signPayload, validateState, verifySignature } from "../src/security.js"

describe("OAuth PKCE and state", () => {
	it("creates an RFC 7636 S256 verifier and challenge", () => {
		const pending = createPkceState(123)
		assert.equal(pending.createdAt, 123)
		assert.ok(pending.verifier.length >= 43)
		assert.equal(pending.challenge, createHash("sha256").update(pending.verifier).digest("base64url"))
		assert.ok(pending.state.length >= 32)
	})

	it("accepts a current exact state and rejects mismatch or expiry", () => {
		const pending = createPkceState(1_000)
		assert.doesNotThrow(() => validateState(pending, pending.state, 1_999, 1_000))
		assert.throws(() => validateState(pending, "wrong", 1_999, 1_000), /Invalid OAuth state/)
		assert.throws(() => validateState(pending, pending.state, 2_001, 1_000), /OAuth state expired/)
	})
})

describe("intake signing", () => {
	it("authenticates the timestamp, nonce, and exact payload", () => {
		const signature = signPayload("a-secure-secret", "1000", "unique-nonce", '{"ok":true}')
		assert.equal(verifySignature("a-secure-secret", "1000", "unique-nonce", '{"ok":true}', signature), true)
		assert.equal(verifySignature("a-secure-secret", "1001", "unique-nonce", '{"ok":true}', signature), false)
		assert.equal(verifySignature("a-secure-secret", "1000", "other-nonce", '{"ok":true}', signature), false)
		assert.equal(verifySignature("a-secure-secret", "1000", "unique-nonce", '{"ok":false}', signature), false)
	})
})

describe("sensitive log redaction", () => {
	it("deeply redacts known credential fields, bearer values, and JWTs", () => {
		const value = redactSensitive({
			accessToken: "secret-access",
			nested: { refresh_token: "secret-refresh", safe: "Bearer abc.def-123" },
			message: "failed eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature",
		})
		assert.deepEqual(value, {
			accessToken: "[REDACTED]",
			nested: { refresh_token: "[REDACTED]", safe: "Bearer [REDACTED]" },
			message: "failed [REDACTED]",
		})
	})
})

import assert from "node:assert/strict"
import { describe, it } from "node:test"
import { CODEX_REDIRECT_URI, loadConfig, validateBackendUrl, validateRedirect } from "../src/config.js"

const valid = {
	MAVECODE_CODEX_CLIENT_ID: "explicit-client",
	MAVECODE_CODEX_REDIRECT_URI: CODEX_REDIRECT_URI,
	MAVECODE_APPS_SCRIPT_URL: "https://script.google.com/macros/s/deployment_123/exec",
	MAVECODE_INTAKE_SECRET: "a".repeat(32),
}

describe("configuration", () => {
	it("requires all sensitive/deployment values explicitly", () => {
		for (const key of Object.keys(valid)) {
			const environment = { ...valid, [key]: undefined }
			assert.throws(() => loadConfig(environment), /Missing required configuration/)
		}
	})

	it("forces the listener host and validates defaults", () => {
		const config = loadConfig(valid)
		assert.equal(config.host, "127.0.0.1")
		assert.equal(config.redirectUri, "http://localhost:1455/auth/callback")
		assert.equal(config.port, 4567)
		assert.equal(config.maxBodyBytes, 16_384)
	})

	for (const url of [
		"http://127.0.0.1:1455/auth/callback",
		"http://localhost:4567/auth/callback",
		"http://evil.example:1455/auth/callback",
		"https://localhost:1455/auth/callback",
		"http://user:pass@localhost:1455/auth/callback",
		"http://localhost:1455/auth/callback/",
		"http://localhost:1455/wrong",
		"http://localhost:1455/auth/callback?next=evil",
		"http://localhost:1455/auth/callback#fragment",
	]) {
		it(`rejects non-exact Codex redirect ${url}`, () => assert.throws(() => validateRedirect(url), /must exactly match/))
	}

	it("accepts only the registered localhost Codex callback", () => {
		assert.equal(validateRedirect(CODEX_REDIRECT_URI), CODEX_REDIRECT_URI)
	})

	for (const url of [
		"http://script.google.com/macros/s/id/exec",
		"https://evil.example/macros/s/id/exec",
		"https://script.google.com.evil.example/macros/s/id/exec",
		"https://script.google.com/macros/s/id/exec?redirect=evil",
		"https://script.google.com/macros/s/id/exec/",
		"https://user:pass@script.google.com/macros/s/id/exec",
	]) {
		it(`rejects non-exact backend URL ${url}`, () => assert.throws(() => validateBackendUrl(url)))
	}

	it("accepts only the exact Apps Script deployment form", () => {
		assert.equal(validateBackendUrl(valid.MAVECODE_APPS_SCRIPT_URL), valid.MAVECODE_APPS_SCRIPT_URL)
	})
})

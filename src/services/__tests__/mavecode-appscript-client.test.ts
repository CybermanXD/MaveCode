import { afterEach, describe, expect, it, vi } from "vitest"

import {
	MAVECODE_CHAT_REQUEST_TIMEOUT_MS,
	MAVECODE_REQUEST_TIMEOUT_MS,
	MaveCodeAppsScriptClient,
	normalizeMaveCodeBackendUrl,
	redactMaveCodeError,
} from "../mavecode-appscript-client"

describe("MaveCodeAppsScriptClient", () => {
	afterEach(() => vi.restoreAllMocks())

	it("serializes an exact Apps Script action request", async () => {
		const fetchMock = vi
			.spyOn(globalThis, "fetch")
			.mockResolvedValue(
				new Response(JSON.stringify({ ok: true, protocolVersion: "mavecode.v1", data: { ready: true } })),
			)
		await new MaveCodeAppsScriptClient("https://script.google.com/macros/s/deployment/exec").action("health")
		expect(fetchMock).toHaveBeenCalledWith(
			"https://script.google.com/macros/s/deployment/exec",
			expect.objectContaining({ method: "POST", body: JSON.stringify({ action: "health" }) }),
		)
	})

	it("rejects insecure configuration", () => {
		expect(() => normalizeMaveCodeBackendUrl("http://example.test/exec")).toThrow("must use HTTPS")
	})

	it("does not send a request when already aborted", async () => {
		const fetchMock = vi.spyOn(globalThis, "fetch")
		const controller = new AbortController()
		controller.abort()
		await expect(
			new MaveCodeAppsScriptClient("https://example.test/exec").action("models", {}, controller.signal),
		).rejects.toMatchObject({ code: "REQUEST_ABORTED" })
		expect(fetchMock).not.toHaveBeenCalled()
	})

	it("uses an Apps Script/Codex-appropriate timeout for buffered chat only", async () => {
		const timeoutSpy = vi.spyOn(AbortSignal, "timeout")
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ ok: true, protocolVersion: "mavecode.v1", data: {} })),
		)
		const client = new MaveCodeAppsScriptClient("https://example.test/exec")
		await client.action("health")
		await client.action("chat")
		expect(timeoutSpy).toHaveBeenNthCalledWith(1, MAVECODE_REQUEST_TIMEOUT_MS)
		expect(timeoutSpy).toHaveBeenNthCalledWith(2, MAVECODE_CHAT_REQUEST_TIMEOUT_MS)
	})

	it("allows per-action timeout configuration without weakening other actions", async () => {
		const timeoutSpy = vi.spyOn(AbortSignal, "timeout")
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(JSON.stringify({ ok: true, protocolVersion: "mavecode.v1", data: {} })),
		)
		const client = new MaveCodeAppsScriptClient("https://example.test/exec", { chat: 90_000 })
		await client.action("models")
		await client.action("chat")
		expect(timeoutSpy).toHaveBeenNthCalledWith(1, MAVECODE_REQUEST_TIMEOUT_MS)
		expect(timeoutSpy).toHaveBeenNthCalledWith(2, 90_000)
	})

	it("normalizes protocol errors and redacts session material", async () => {
		vi.spyOn(globalThis, "fetch").mockResolvedValue(
			new Response(
				JSON.stringify({
					ok: false,
					protocolVersion: "mavecode.v1",
					error: {
						code: "SESSION_EXPIRED",
						message: "Bearer mave_ext_abcdefghijklmnopqrstuvwxyz",
						retryable: false,
					},
				}),
			),
		)
		await expect(
			new MaveCodeAppsScriptClient("https://example.test/exec").action("session-verify"),
		).rejects.toEqual(expect.objectContaining({ code: "SESSION_EXPIRED", message: "[REDACTED]" }))
		expect(redactMaveCodeError("mave_ext_abcdefghijklmnopqrstuvwxyz")).toBe("[REDACTED]")
	})

	it("marks network failures retryable without leaking their details", async () => {
		vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Bearer mave_ext_secret"))
		await expect(new MaveCodeAppsScriptClient("https://example.test/exec").action("health")).rejects.toMatchObject({
			code: "BACKEND_UNAVAILABLE",
			retryable: true,
		})
	})
})

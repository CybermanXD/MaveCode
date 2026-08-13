// npx vitest run src/api/providers/__tests__/mave-gateway.spec.ts

import type { ApiHandlerOptions } from "../../../shared/api"
import { collectStream } from "../../../test-utils/stream"
import { MaveGatewayHandler, classifyGatewayApiError, toGatewayStreamError } from "../mave-gateway"

const { mockBackendAction, mockGetCachedToken, mockClearToken, mockGetModels } = vitest.hoisted(() => ({
	mockBackendAction: vitest.fn(),
	mockGetCachedToken: vitest.fn<() => string>(),
	mockClearToken: vitest.fn<() => Promise<void>>(),
	mockGetModels: vitest.fn(),
}))

vitest.mock("../../../services/mavecode-appscript-client", () => ({
	MaveCodeAppsScriptClient: class {
		action = mockBackendAction
	},
	MaveCodeBackendError: class extends Error {
		constructor(
			public code: string,
			message: string,
			public retryable = false,
		) {
			super(message)
		}
	},
}))

vitest.mock("../../../services/mave-code-auth", () => ({
	getCachedMaveCodeToken: mockGetCachedToken,
	clearMaveCodeToken: mockClearToken,
}))

vitest.mock("../fetchers/mave-gateway", () => ({ getMaveGatewayModels: mockGetModels }))

const options: ApiHandlerOptions = {
	maveGatewayBaseUrl: "https://example.invalid/exec",
	maveGatewayModelId: "managed/codex",
}

describe("MaveGatewayHandler", () => {
	beforeEach(() => {
		vitest.clearAllMocks()
		mockGetCachedToken.mockReturnValue("mave_ext_test_token")
	})

	it("serializes tool history and maps normalized buffered events", async () => {
		mockBackendAction.mockResolvedValueOnce({
			id: "response-1",
			model: "managed/codex",
			events: [
				{ type: "text", text: "checking" },
				{ type: "tool_call", id: "call_2", name: "write_file", arguments: '{"path":"b"}' },
				{ type: "usage", inputTokens: 12, outputTokens: 4, totalTokens: 16 },
				{ type: "completed" },
			],
		})
		const handler = new MaveGatewayHandler(options)

		const chunks = await collectStream(
			handler.createMessage(
				"system",
				[
					{ role: "user", content: "read" },
					{
						role: "assistant",
						content: [{ type: "tool_use", id: "call_1", name: "read_file", input: { path: "a" } }],
					},
					{ role: "user", content: [{ type: "tool_result", tool_use_id: "call_1", content: "contents" }] },
				],
				{
					taskId: "task-1",
					tools: [
						{
							type: "function",
							function: { name: "write_file", description: "Write", parameters: { type: "object" } },
						},
					],
					tool_choice: "auto",
					parallelToolCalls: false,
				},
			),
		)

		expect(mockBackendAction).toHaveBeenCalledWith(
			"chat",
			expect.objectContaining({
				sessionToken: "mave_ext_test_token",
				protocolVersion: "mavecode.v1",
				model: "managed/codex",
				parallelToolCalls: false,
				promptCacheKey: "task-1",
				messages: [
					{ role: "system", content: "system" },
					{ role: "user", content: "read" },
					{
						role: "assistant",
						content: "",
						toolCalls: [{ id: "call_1", name: "read_file", arguments: '{"path":"a"}' }],
					},
					{ role: "tool", toolCallId: "call_1", content: "contents" },
				],
			}),
			undefined,
		)
		expect(chunks).toEqual([
			{ type: "text", text: "checking" },
			{ type: "tool_call", id: "call_2", name: "write_file", arguments: '{"path":"b"}' },
			{ type: "usage", inputTokens: 12, outputTokens: 4 },
		])
	})

	it("requires an authenticated managed session", async () => {
		mockGetCachedToken.mockReturnValue("")

		await expect(
			collectStream(new MaveGatewayHandler(options).createMessage("system", [{ role: "user", content: "hi" }])),
		).rejects.toThrow("MaveCode sign-in is required")
		expect(mockBackendAction).not.toHaveBeenCalled()
	})

	it("normalizes text-block arrays produced for plain user prompts", async () => {
		mockBackendAction.mockResolvedValueOnce({
			id: "response-text",
			model: "managed/codex",
			events: [{ type: "text", text: "hello" }, { type: "completed" }],
		})

		const chunks = await collectStream(
			new MaveGatewayHandler(options).createMessage("system", [
				{
					role: "user",
					content: [
						{ type: "text", text: "hi" },
						{ type: "text", text: "there" },
					],
				},
			]),
		)

		expect(mockBackendAction).toHaveBeenCalledWith(
			"chat",
			expect.objectContaining({
				messages: [
					{ role: "system", content: "system" },
					{ role: "user", content: "hi\nthere" },
				],
			}),
			undefined,
		)
		expect(chunks).toEqual([{ type: "text", text: "hello" }])
	})

	it("forwards image content to the managed multimodal backend", async () => {
		mockBackendAction.mockResolvedValueOnce({
			id: "response-image",
			model: "managed/codex",
			events: [{ type: "text", text: "image received" }, { type: "completed" }],
		})
		await collectStream(
			new MaveGatewayHandler(options).createMessage("system", [
				{
					role: "user",
					content: [
						{
							type: "image",
							source: { type: "base64", media_type: "image/png", data: "AA==" },
						},
					],
				},
			]),
		)
		expect(mockBackendAction).toHaveBeenCalledWith(
			"chat",
			expect.objectContaining({
				messages: [
					{ role: "system", content: "system" },
					{ role: "user", content: [{ type: "image_url", imageUrl: "data:image/png;base64,AA==" }] },
				],
			}),
			undefined,
		)
	})

	it("clears an invalid managed session", async () => {
		const { MaveCodeBackendError } = await import("../../../services/mavecode-appscript-client")
		mockBackendAction.mockRejectedValueOnce(new MaveCodeBackendError("SESSION_EXPIRED", "expired"))

		await expect(
			collectStream(new MaveGatewayHandler(options).createMessage("system", [{ role: "user", content: "hi" }])),
		).rejects.toThrow("expired")
		expect(mockClearToken).toHaveBeenCalledOnce()
	})

	it("fetches and caches managed model metadata", async () => {
		mockGetModels.mockResolvedValueOnce({
			"managed/codex": { maxTokens: 8192, contextWindow: 200_000, supportsImages: false },
		})
		const handler = new MaveGatewayHandler(options)

		await handler.ensureModelFetched()

		expect(handler.getModel()).toEqual({
			id: "managed/codex",
			info: { maxTokens: 8192, contextWindow: 200_000, supportsImages: false },
		})
		expect(mockGetModels).toHaveBeenCalledWith(options)
	})

	it("classifies managed backend failures without relying on HTTP status", async () => {
		const { MaveCodeBackendError } = await import("../../../services/mavecode-appscript-client")
		expect(classifyGatewayApiError(new MaveCodeBackendError("UNAUTHENTICATED", "sign in"))).toEqual({
			kind: "sign_in",
		})
		expect(classifyGatewayApiError(new MaveCodeBackendError("PROVIDER_UNAVAILABLE", "provider"))).toEqual({
			kind: "provider_unavailable",
		})
		expect(classifyGatewayApiError(new MaveCodeBackendError("BACKEND_TIMEOUT", "backend"))).toEqual({
			kind: "backend_unavailable",
		})
	})

	it("normalizes unknown stream failures", async () => {
		const { MaveCodeBackendError } = await import("../../../services/mavecode-appscript-client")
		const existing = new MaveCodeBackendError("PROVIDER_ERROR", "provider failed")
		expect(toGatewayStreamError(existing)).toBe(existing)
		expect(toGatewayStreamError(new Error("secret detail"))).toMatchObject({
			code: "MAVECODE_ERROR",
			message: "MaveCode request failed",
		})
	})
})

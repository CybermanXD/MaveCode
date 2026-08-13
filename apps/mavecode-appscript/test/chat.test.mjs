import assert from "node:assert/strict"
import test from "node:test"
import Backend from "../src/core.js"
import { configuredProperties, createMocks, event } from "./mocks.mjs"

function readyDeps(fetch, extra = {}) {
	const deps = createMocks({ properties: configuredProperties(extra), email: "user@example.invalid", fetch })
	deps.properties.setProperty("provider.codex", JSON.stringify({ accessToken: "provider-private-value", refreshToken: "refresh-private-value", idToken: "id-private-value", accountId: "account-123", email: "admin@example.invalid", expiresAt: deps.now() + 60_000, updatedAt: deps.now() }))
	return deps
}

function issue(deps) { return Backend.handle("POST", event({ action: "session-issue" }), deps).body.data.sessionToken }

test("models returns versioned buffered tool capabilities", () => {
	const deps = readyDeps(() => {})
	const response = Backend.handle("POST", event({ action: "models", sessionToken: issue(deps) }), deps)
	assert.equal(response.body.data.catalogVersion, "1.0.0")
	assert.deepEqual(response.body.data.models[0].capabilities, { input: ["text", "image"], output: ["text"], multiTurn: true, streaming: false, tools: true })
})

test("rate limits are securely fetched with provider credentials and normalized", () => {
	let call
	const deps = readyDeps((url, options) => {
		call = { url, options }
		return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ plan_type: "plus", rate_limit: {
			primary_window: { limit_window_seconds: 18000, used_percent: 25.4, reset_at: 2_000_000_000 },
			secondary_window: { limit_window_seconds: 604800, used_percent: 67.8, reset_at: 2_000_500_000 },
		} }) }
	})
	const response = Backend.handle("POST", event({ action: "rate-limits", sessionToken: issue(deps) }), deps)
	assert.equal(call.url, "https://chatgpt.com/backend-api/wham/usage")
	assert.equal(call.options.headers.Authorization, "Bearer provider-private-value")
	assert.equal(call.options.headers["ChatGPT-Account-Id"], "account-123")
	assert.deepEqual(response.body.data, {
		primary: { usedPercent: 25.4, windowMinutes: 300, resetsAt: 2_000_000_000_000 },
		secondary: { usedPercent: 67.8, windowMinutes: 10080, resetsAt: 2_000_500_000_000 },
		planType: "plus",
		fetchedAt: deps.now(),
	})
	assert.equal(JSON.stringify(response.body).includes("private-value"), false)
})

test("chat accepts image input and maps it to the Codex Responses schema", () => {
	let payload
	const deps = readyDeps((_url, options) => {
		payload = JSON.parse(options.payload)
		return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ output_text: "seen" }) }
	})
	const response = Backend.handle("POST", event({
		action: "chat", protocolVersion: "mavecode.v1", sessionToken: issue(deps), model: "codex-test-model",
		messages: [{ role: "user", content: [
			{ type: "text", text: "describe" },
			{ type: "image_url", imageUrl: "data:image/png;base64,AA==" },
		] }],
	}), deps)
	assert.equal(response.status, 200)
	assert.deepEqual(payload.input[0].content, [
		{ type: "input_text", text: "describe" },
		{ type: "input_image", image_url: "data:image/png;base64,AA==" },
	])
})

test("chat serializes multi-turn text and returns normalized text without credentials", () => {
	let call
	const deps = readyDeps((url, options) => {
		call = { url, options }
		return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ id: "response-id", choices: [{ message: { content: "done" }, finish_reason: "stop" }], usage: { prompt_tokens: 8, completion_tokens: 2, total_tokens: 10 } }) }
	})
	const messages = [{ role: "system", content: "be concise" }, { role: "user", content: "hello" }, { role: "assistant", content: "hi" }, { role: "user", content: "continue" }]
	const response = Backend.handle("POST", event({ action: "chat", protocolVersion: "mavecode.v1", sessionToken: issue(deps), model: "codex-test-model", messages }), deps)
	assert.equal(response.status, 200)
	assert.equal(call.url, "https://chatgpt.com/backend-api/codex/responses")
	assert.equal(call.options.followRedirects, false)
	assert.deepEqual(JSON.parse(call.options.payload).input, [
		{ role: "user", content: [{ type: "input_text", text: "hello" }] },
		{ role: "assistant", content: [{ type: "output_text", text: "hi" }] },
		{ role: "user", content: [{ type: "input_text", text: "continue" }] },
	])
	assert.equal(call.options.headers.Authorization, "Bearer provider-private-value")
	assert.equal(call.options.headers.originator, "mave-code")
	assert.match(call.options.headers.session_id, /^mavecode-appscript-/)
	assert.equal(call.options.headers["User-Agent"], "mavecode-appscript/1.0 GoogleAppsScript")
	assert.equal(call.options.headers["ChatGPT-Account-Id"], "account-123")
	assert.equal(JSON.parse(call.options.payload).stream, true)
	assert.deepEqual(response.body.data.events, [
		{ type: "text", text: "done" },
		{ type: "usage", inputTokens: 8, outputTokens: 2, totalTokens: 10 },
		{ type: "completed" },
	])
	assert.equal(JSON.stringify(response.body).includes("private-value"), false)
})

test("chat preserves the inherited stateless streaming contract and stable prompt-cache affinity", () => {
	let call
	const deps = readyDeps((url, options) => {
		call = { url, options }
		return { getResponseCode: () => 200, getContentText: () => [
			'data: {"type":"response.output_text.delta","delta":"done"}',
			'data: {"type":"response.completed","response":{"id":"r1"}}',
			"data: [DONE]",
		].join("\n") }
	})
	const response = Backend.handle("POST", event({
		action: "chat", protocolVersion: "mavecode.v1", sessionToken: issue(deps), model: "codex-test-model",
		promptCacheKey: "task-123", messages: [{ role: "user", content: "hello" }],
	}), deps)
	const payload = JSON.parse(call.options.payload)
	assert.equal(response.status, 200)
	assert.equal(payload.stream, true)
	assert.equal(payload.store, false)
	assert.equal(payload.prompt_cache_key, "task-123")
	assert.equal(call.options.headers.session_id, "task-123")
	assert.deepEqual(response.body.data.events, [{ type: "text", text: "done" }, { type: "completed" }])
})

test("chat rejects an unsafe prompt-cache key before provider dispatch", () => {
	let fetched = false
	const deps = readyDeps(() => { fetched = true })
	const response = Backend.handle("POST", event({
		action: "chat", protocolVersion: "mavecode.v1", sessionToken: issue(deps), model: "codex-test-model",
		promptCacheKey: "unsafe key", messages: [{ role: "user", content: "hello" }],
	}), deps)
	assert.equal(response.body.error.code, "INVALID_REQUEST")
	assert.equal(fetched, false)
})

test("chat omits the Codex account header when the relayed package has no account ID", () => {
	let headers
	const deps = readyDeps((_url, options) => {
		headers = options.headers
		return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ output_text: "done" }) }
	})
	const provider = JSON.parse(deps.properties.getProperty("provider.codex"))
	delete provider.accountId
	deps.properties.setProperty("provider.codex", JSON.stringify(provider))
	const response = Backend.handle("POST", event({ action: "chat", protocolVersion: "mavecode.v1", sessionToken: issue(deps), model: "codex-test-model", messages: [{ role: "user", content: "hello" }] }), deps)
	assert.equal(response.status, 200)
	assert.equal(Object.hasOwn(headers, "ChatGPT-Account-Id"), false)
})

test("chat enforces model, request, response, quota, and provider expiry", () => {
	const deps = readyDeps(() => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ choices: [{ message: { content: "x" } }] }) }), { MAVECODE_QUOTA_PER_MINUTE: "1", MAVECODE_MAX_RESPONSE_BYTES: "100" })
	const token = issue(deps)
	const base = { action: "chat", protocolVersion: "mavecode.v1", sessionToken: token, messages: [{ role: "user", content: "hello" }] }
	assert.equal(Backend.handle("POST", event({ ...base, model: "forbidden" }), deps).body.error.code, "MODEL_NOT_ALLOWED")
	assert.equal(Backend.handle("POST", event({ ...base, model: "codex-test-model" }), deps).status, 200)
	assert.equal(Backend.handle("POST", event({ ...base, model: "codex-test-model" }), deps).body.error.code, "QUOTA_EXCEEDED")
	deps.setNow(deps.now() + 61_000)
	assert.equal(Backend.handle("POST", event({ ...base, model: "codex-test-model" }), deps).body.error.code, "PROVIDER_EXPIRED")

	const largeResponse = readyDeps(() => ({ getResponseCode: () => 200, getContentText: () => "x".repeat(101) }), { MAVECODE_MAX_RESPONSE_BYTES: "100" })
	assert.equal(Backend.handle("POST", event({ ...base, sessionToken: issue(largeResponse), model: "codex-test-model" }), largeResponse).body.error.code, "PROVIDER_RESPONSE_TOO_LARGE")
})

test("chat round-trips multiple tool calls and results to Codex Responses schema", () => {
	let payload
	const deps = readyDeps((_url, options) => {
		payload = JSON.parse(options.payload)
		return { getResponseCode: () => 200, getContentText: () => JSON.stringify({ id: "r1", output: [
			{ type: "function_call", call_id: "call_c", name: "finish", arguments: '{"ok":true}' },
		], usage: { input_tokens: 20, output_tokens: 3, total_tokens: 23 } }) }
	})
	const body = {
		action: "chat", protocolVersion: "mavecode.v1", sessionToken: issue(deps), model: "codex-test-model",
		tools: [{ type: "function", function: { name: "read_file", description: "Read", parameters: { type: "object", properties: { path: { type: "string" } } } } }],
		toolChoice: "auto", parallelToolCalls: true,
		messages: [
			{ role: "user", content: "inspect" },
			{ role: "assistant", content: "", toolCalls: [
				{ id: "call_a", name: "read_file", arguments: '{"path":"a"}' },
				{ id: "call_b", name: "read_file", arguments: '{"path":"b"}' },
			] },
			{ role: "tool", toolCallId: "call_a", content: "A" },
			{ role: "tool", toolCallId: "call_b", content: "B" },
			{ role: "user", content: "finish" },
		],
	}
	const response = Backend.handle("POST", event(body), deps)
	assert.equal(response.status, 200)
	assert.deepEqual(payload.input.slice(1, 5), [
		{ type: "function_call", call_id: "call_a", name: "read_file", arguments: '{"path":"a"}' },
		{ type: "function_call", call_id: "call_b", name: "read_file", arguments: '{"path":"b"}' },
		{ type: "function_call_output", call_id: "call_a", output: "A" },
		{ type: "function_call_output", call_id: "call_b", output: "B" },
	])
	assert.equal(response.body.data.events[0].type, "tool_call")
	assert.equal(response.body.data.events[0].id, "call_c")
})

test("chat collects fragmented SSE tool arguments", () => {
	const sse = [
		'data: {"type":"response.output_item.added","output_index":0,"item":{"type":"function_call","call_id":"call_1","name":"read_file","arguments":""}}',
		'data: {"type":"response.function_call_arguments.delta","output_index":0,"delta":"{\\"path\\":"}',
		'data: {"type":"response.function_call_arguments.delta","output_index":0,"delta":"\\"x\\"}"}',
		'data: {"type":"response.completed","response":{"usage":{"input_tokens":4,"output_tokens":2,"total_tokens":6}}}',
		"data: [DONE]",
	].join("\n")
	const deps = readyDeps(() => ({ getResponseCode: () => 200, getContentText: () => sse }))
	const response = Backend.handle("POST", event({ action: "chat", protocolVersion: "mavecode.v1", sessionToken: issue(deps), model: "codex-test-model", messages: [{ role: "user", content: "read" }] }), deps)
	assert.deepEqual(response.body.data.events[0], { type: "tool_call", id: "call_1", name: "read_file", arguments: '{"path":"x"}' })
	assert.deepEqual(response.body.data.events[1], { type: "usage", inputTokens: 4, outputTokens: 2, totalTokens: 6 })
})

test("chat rejects malformed tool IDs, arguments, ordering, protocol, and limits", () => {
	const deps = readyDeps(() => ({ getResponseCode: () => 200, getContentText: () => JSON.stringify({ output_text: "x" }) }))
	const token = issue(deps)
	const send = (messages, extra = {}) => Backend.handle("POST", event({ action: "chat", protocolVersion: "mavecode.v1", sessionToken: token, model: "codex-test-model", messages, ...extra }), deps)
	assert.equal(send([{ role: "assistant", content: "bad" }]).body.error.code, "INVALID_MESSAGE_ORDER")
	assert.equal(send([{ role: "user", content: "x" }, { role: "tool", toolCallId: "missing", content: "x" }]).body.error.code, "INVALID_MESSAGE_ORDER")
	assert.equal(send([{ role: "user", content: "x" }, { role: "assistant", content: "", toolCalls: [{ id: "bad id", name: "x", arguments: "{}" }] }]).body.error.code, "INVALID_TOOL_CALL")
	assert.equal(send([{ role: "user", content: "x" }, { role: "assistant", content: "", toolCalls: [{ id: "call_1", name: "x", arguments: "{" }] }]).body.error.code, "INVALID_TOOL_ARGUMENTS")
	assert.equal(send([{ role: "user", content: "x".repeat(65_537) }]).body.error.code, "PAYLOAD_TOO_LARGE")
	assert.equal(send([{ role: "user", content: [{ type: "image_url", imageUrl: "http://unsafe.invalid/x.png" }] }]).body.error.code, "INVALID_IMAGE")
	assert.equal(Backend.handle("POST", event({ action: "chat", protocolVersion: "future", sessionToken: token, model: "codex-test-model", messages: [{ role: "user", content: "x" }] }), deps).body.error.code, "PROTOCOL_MISMATCH")
})

test("provider errors expose safe actionable diagnostics without leaking the response", () => {
	const deps = readyDeps(() => ({ getResponseCode: () => 401, getContentText: () => JSON.stringify({ access_token: "must-not-escape", error: { code: "token_expired", message: "Bearer must-not-escape" } }) }))
	const response = Backend.handle("POST", event({ action: "chat", protocolVersion: "mavecode.v1", sessionToken: issue(deps), model: "codex-test-model", messages: [{ role: "user", content: "hello" }] }), deps)
	assert.deepEqual(response.body.error, { code: "PROVIDER_ERROR", message: "Provider authorization was rejected. Ask an administrator to reconnect Codex credentials.", retryable: false })
	assert.deepEqual(deps.logs, [{ event: "provider_http_error", details: { operation: "chat", status: 401, providerCode: "token_expired" } }])
	assert.equal(JSON.stringify(response.body).includes("must-not-escape"), false)
	assert.equal(JSON.stringify(deps.logs).includes("must-not-escape"), false)
})

test("provider diagnostics suppress non-allowlisted upstream error codes", () => {
	const deps = readyDeps(() => ({ getResponseCode: () => 400, getContentText: () => JSON.stringify({ error: { code: "novel_error", message: "must-not-escape" } }) }))
	Backend.handle("POST", event({ action: "chat", protocolVersion: "mavecode.v1", sessionToken: issue(deps), model: "codex-test-model", messages: [{ role: "user", content: "hello" }] }), deps)
	assert.deepEqual(deps.logs, [{ event: "provider_http_error", details: { operation: "chat", status: 400, providerCode: "unknown" } }])
	assert.equal(JSON.stringify(deps.logs).includes("must-not-escape"), false)
})

test("provider request compatibility failures recommend deploying the latest backend", () => {
	const deps = readyDeps(() => ({ getResponseCode: () => 400, getContentText: () => JSON.stringify({ error: { message: "unsupported field" } }) }))
	const response = Backend.handle("POST", event({ action: "chat", protocolVersion: "mavecode.v1", sessionToken: issue(deps), model: "codex-test-model", messages: [{ role: "user", content: "hello" }] }), deps)
	assert.deepEqual(response.body.error, { code: "PROVIDER_ERROR", message: "Provider rejected the backend request (HTTP 400). Deploy the latest MaveCode Apps Script backend and try again.", retryable: false })
	assert.deepEqual(deps.logs, [{ event: "provider_http_error", details: { operation: "chat", status: 400, providerCode: "unknown" } }])
})

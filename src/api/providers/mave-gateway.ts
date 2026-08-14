import { Anthropic } from "@anthropic-ai/sdk"
import type { ModelInfo } from "@roo-code/types"

import type { ApiHandlerCreateMessageMetadata, CompletePromptOptions, SingleCompletionHandler } from "../index"
import type { ApiStream } from "../transform/stream"
import { convertToOpenAiMessages } from "../transform/openai-format"
import type { ApiHandlerOptions } from "../../shared/api"
import { BaseProvider } from "./base-provider"
import { MaveCodeAppsScriptClient, MaveCodeBackendError } from "../../services/mavecode-appscript-client"
import { clearMaveCodeToken, getCachedMaveCodeToken } from "../../services/mave-code-auth"
import { getMaveGatewayModels } from "./fetchers/mave-gateway"

type ChatResult = {
	id: string
	model: string
	events: Array<
		| { type: "text"; text: string }
		| { type: "tool_call"; id: string; name: string; arguments: string }
		| { type: "usage"; inputTokens?: number; outputTokens?: number; totalTokens?: number }
		| { type: "completed" }
		| { type: "error"; code?: string; message: string }
	>
}

type GatewayMessage =
	| { role: "system"; content: string }
	| { role: "user"; content: string | GatewayUserContentPart[] }
	| { role: "assistant"; content: string; toolCalls?: Array<{ id: string; name: string; arguments: string }> }
	| { role: "tool"; content: string; toolCallId: string }

type GatewayUserContentPart = { type: "text"; text: string } | { type: "image_url"; imageUrl: string }

// Keep compatibility with already-deployed mavecode.v1 backends, which accepted
// multiple leading system messages but capped each individual message at 64 KiB.
// The complete request still has the backend's independent aggregate size limit.
const LEGACY_GATEWAY_MESSAGE_BYTES = 60 * 1024

function utf8Length(value: string): number {
	return Buffer.byteLength(value, "utf8")
}

export function splitGatewaySystemPrompt(prompt: string, maxBytes = LEGACY_GATEWAY_MESSAGE_BYTES): string[] {
	if (!prompt || utf8Length(prompt) <= maxBytes) return prompt ? [prompt] : []
	if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error("Gateway message size must be positive")

	const chunks: string[] = []
	let remaining = prompt
	while (remaining) {
		let low = 1
		let high = remaining.length
		let end = 1
		while (low <= high) {
			const middle = Math.floor((low + high) / 2)
			const candidateEnd =
				middle < remaining.length && /[\uD800-\uDBFF]/.test(remaining[middle - 1]) ? middle - 1 : middle
			if (candidateEnd > 0 && utf8Length(remaining.slice(0, candidateEnd)) <= maxBytes) {
				end = candidateEnd
				low = middle + 1
			} else {
				high = middle - 1
			}
		}

		// Prefer a nearby line boundary so injected rules/references remain readable.
		const lineBreak = remaining.lastIndexOf("\n", end - 1)
		if (lineBreak >= Math.floor(end * 0.75)) end = lineBreak + 1
		chunks.push(remaining.slice(0, end))
		remaining = remaining.slice(end)
	}
	return chunks
}

function normalizeTextContent(content: unknown, message: string): string {
	if (typeof content === "string") return content
	if (
		Array.isArray(content) &&
		content.every(
			(part) =>
				part !== null &&
				typeof part === "object" &&
				(part as { type?: unknown }).type === "text" &&
				typeof (part as { text?: unknown }).text === "string",
		)
	) {
		return content.map((part) => (part as { text: string }).text).join("\n")
	}
	throw new MaveCodeBackendError("UNSUPPORTED_CONTENT", message)
}

function normalizeUserContent(content: unknown): string | GatewayUserContentPart[] {
	if (typeof content === "string") return content
	if (!Array.isArray(content))
		throw new MaveCodeBackendError("UNSUPPORTED_CONTENT", "MaveCode message content is invalid")
	return content.map((part): GatewayUserContentPart => {
		if (part && typeof part === "object" && (part as { type?: unknown }).type === "text") {
			const text = (part as { text?: unknown }).text
			if (typeof text === "string") return { type: "text", text }
		}
		if (part && typeof part === "object" && (part as { type?: unknown }).type === "image_url") {
			const imageUrl = (part as { image_url?: { url?: unknown } }).image_url?.url
			if (typeof imageUrl === "string") return { type: "image_url", imageUrl }
		}
		throw new MaveCodeBackendError("UNSUPPORTED_CONTENT", "MaveCode message content is invalid")
	})
}

const fallbackModelInfo: ModelInfo = {
	maxTokens: 4096,
	contextWindow: 128_000,
	supportsImages: true,
	supportsPromptCache: false,
}

export function toGatewayStreamError(raw: unknown): Error {
	if (raw instanceof MaveCodeBackendError) return raw
	return new MaveCodeBackendError("MAVECODE_ERROR", "MaveCode request failed")
}

export function classifyGatewayApiError(error: unknown): {
	kind: "sign_in" | "provider_unavailable" | "backend_unavailable" | "none"
} {
	const code = error instanceof MaveCodeBackendError ? error.code : ""
	if (["SESSION_EXPIRED", "UNAUTHENTICATED", "FORBIDDEN"].includes(code)) return { kind: "sign_in" }
	if (["PROVIDER_EXPIRED", "PROVIDER_UNAVAILABLE", "PROVIDER_ERROR"].includes(code))
		return { kind: "provider_unavailable" }
	if (["BACKEND_UNAVAILABLE", "BACKEND_TIMEOUT", "NOT_CONFIGURED"].includes(code))
		return { kind: "backend_unavailable" }
	return { kind: "none" }
}

/** Buffered Apps Script adapter. Streaming remains a separate future transport. */
export class MaveGatewayHandler extends BaseProvider implements SingleCompletionHandler {
	private readonly client: MaveCodeAppsScriptClient
	private models: Record<string, ModelInfo> = {}
	private modelFetchPromise?: Promise<{ id: string; info: ModelInfo }>

	constructor(private readonly options: ApiHandlerOptions) {
		super()
		this.client = new MaveCodeAppsScriptClient(options.maveGatewayBaseUrl ?? "")
	}

	override getModel(): { id: string; info: ModelInfo } {
		const id = this.options.maveGatewayModelId || ""
		return { id, info: this.models[id] ?? fallbackModelInfo }
	}

	public async fetchModel(): Promise<{ id: string; info: ModelInfo }> {
		if (!this.modelFetchPromise) {
			this.modelFetchPromise = getMaveGatewayModels(this.options)
				.then((models) => {
					this.models = models
					return this.getModel()
				})
				.finally(() => {
					this.modelFetchPromise = undefined
				})
		}
		return this.modelFetchPromise
	}

	public async ensureModelFetched(): Promise<void> {
		await this.fetchModel()
	}

	private async chat(
		messages: GatewayMessage[],
		metadata?: ApiHandlerCreateMessageMetadata,
		signal?: AbortSignal,
	): Promise<ChatResult> {
		const sessionToken = getCachedMaveCodeToken()
		if (!sessionToken) throw new MaveCodeBackendError("UNAUTHENTICATED", "MaveCode sign-in is required")
		try {
			return await this.client.action<ChatResult>(
				"chat",
				{
					sessionToken,
					protocolVersion: "mavecode.v1",
					model: this.options.maveGatewayModelId,
					messages,
					tools: metadata?.tools,
					toolChoice: metadata?.tool_choice,
					parallelToolCalls: metadata?.parallelToolCalls ?? true,
					// Codex uses this stable per-task key for prompt-cache affinity. It is
					// deliberately not generated per request, unlike the transport request ID.
					promptCacheKey: metadata?.taskId,
				},
				signal,
			)
		} catch (error) {
			if (classifyGatewayApiError(error).kind === "sign_in") await clearMaveCodeToken()
			throw error
		}
	}

	override async *createMessage(
		systemPrompt: string,
		messages: Anthropic.Messages.MessageParam[],
		metadata?: ApiHandlerCreateMessageMetadata,
	): ApiStream {
		const converted = convertToOpenAiMessages(messages).map((message): GatewayMessage => {
			if (message.role === "tool") {
				return {
					role: "tool",
					content: normalizeTextContent(message.content, "MaveCode supports text tool results only"),
					toolCallId: message.tool_call_id,
				}
			}
			if (message.role === "assistant") {
				const content = normalizeTextContent(message.content, "MaveCode assistant history supports text only")
				const functionCalls = message.tool_calls?.filter(
					(call): call is Extract<typeof call, { type: "function" }> => call.type === "function",
				)
				return {
					role: "assistant",
					content,
					...(functionCalls?.length
						? {
								toolCalls: functionCalls.map((call) => ({
									id: call.id,
									name: call.function.name,
									arguments: call.function.arguments,
								})),
							}
						: {}),
				}
			}
			if (message.role !== "user")
				throw new MaveCodeBackendError("UNSUPPORTED_CONTENT", "MaveCode message role is not supported")
			return { role: "user", content: normalizeUserContent(message.content) }
		})
		const signal = (metadata as (ApiHandlerCreateMessageMetadata & { signal?: AbortSignal }) | undefined)?.signal
		const systemMessages: GatewayMessage[] = splitGatewaySystemPrompt(systemPrompt).map((content) => ({
			role: "system",
			content,
		}))
		const response = await this.chat([...systemMessages, ...converted], metadata, signal)
		for (const event of response.events) {
			if (event.type === "text" && event.text) yield { type: "text", text: event.text }
			if (event.type === "tool_call")
				yield { type: "tool_call", id: event.id, name: event.name, arguments: event.arguments }
			if (event.type === "usage")
				yield { type: "usage", inputTokens: event.inputTokens ?? 0, outputTokens: event.outputTokens ?? 0 }
			if (event.type === "error") throw new MaveCodeBackendError(event.code ?? "PROVIDER_ERROR", event.message)
		}
	}

	async completePrompt(prompt: string, options?: CompletePromptOptions): Promise<string> {
		const signal = (options as (CompletePromptOptions & { signal?: AbortSignal }) | undefined)?.signal
		const response = await this.chat([{ role: "user", content: prompt }], undefined, signal)
		return response.events
			.filter((event) => event.type === "text")
			.map((event) => event.text)
			.join("")
	}
}

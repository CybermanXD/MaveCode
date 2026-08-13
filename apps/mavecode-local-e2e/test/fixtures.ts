export const PROVIDER_ACCESS_TOKEN = "provider-access-local-e2e-never-log"
export const PROVIDER_REFRESH_TOKEN = "provider-refresh-local-e2e-never-log"
export const INTAKE_SECRET = "local-e2e-intake-secret-at-least-32-bytes-never-log"
export const MODEL = "codex-local-e2e"

export const toolDefinition = {
	type: "function",
	function: {
		name: "read_local_file",
		description: "Read an approved local fixture",
		parameters: {
			type: "object",
			properties: { path: { type: "string" } },
			required: ["path"],
		},
	},
}

export const firstTurnProviderResponse = {
	id: "response-tool-turn",
	output: [
		{
			type: "function_call",
			call_id: "call_local_1",
			name: "read_local_file",
			arguments: JSON.stringify({ path: "fixtures/answer.txt" }),
		},
	],
	usage: { input_tokens: 12, output_tokens: 5, total_tokens: 17 },
}

export const finalProviderResponse = {
	id: "response-final-turn",
	output: [{ type: "message", content: [{ type: "output_text", text: "The approved fixture says 42." }] }],
	usage: { input_tokens: 24, output_tokens: 9, total_tokens: 33 },
}

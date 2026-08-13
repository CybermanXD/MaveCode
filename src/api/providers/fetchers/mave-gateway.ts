import type { ModelInfo } from "@roo-code/types"
import type { ApiHandlerOptions } from "../../../shared/api"
import { getCachedMaveCodeToken } from "../../../services/mave-code-auth"
import { MaveCodeAppsScriptClient, redactMaveCodeError } from "../../../services/mavecode-appscript-client"

type ModelCatalog = {
	models: Array<{ id: string; displayName: string; capabilities: { input: string[]; output: string[] } }>
}

export async function getMaveGatewayModels(options?: ApiHandlerOptions): Promise<Record<string, ModelInfo>> {
	const token = getCachedMaveCodeToken()
	if (!token || !options?.maveGatewayBaseUrl) return {}
	try {
		const catalog = await new MaveCodeAppsScriptClient(options.maveGatewayBaseUrl).action<ModelCatalog>("models", {
			sessionToken: token,
		})
		return Object.fromEntries(catalog.models.map((model) => [model.id, parseMaveGatewayModel({ id: model.id })]))
	} catch (error) {
		console.error(`Error fetching MaveCode models: ${redactMaveCodeError(error)}`)
		return {}
	}
}

export const parseMaveGatewayModel = ({ id }: { id: string; model?: unknown }): ModelInfo => ({
	maxTokens: 4096,
	contextWindow: 128_000,
	supportsImages: true,
	supportsPromptCache: false,
	description: `Managed MaveCode model ${id}`,
})

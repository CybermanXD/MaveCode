import { useEffect, useMemo } from "react"
import {
	type ProviderSettings,
	type OrganizationAllowList,
	type RouterModels,
	maveGatewayDefaultModelId,
	openAiCodexModels,
} from "@roo-code/types"

import { ModelPicker } from "../ModelPicker"
import { OpenAICodexRateLimitDashboard } from "./OpenAICodexRateLimitDashboard"

type MaveGatewayProps = {
	apiConfiguration: ProviderSettings
	setApiConfigurationField: (field: keyof ProviderSettings, value: ProviderSettings[keyof ProviderSettings]) => void
	routerModels?: RouterModels
	organizationAllowList: OrganizationAllowList
	modelValidationError?: string
	simplifySettings?: boolean
}

// Exported for unit tests. Picks the managed Codex default when available,
// otherwise the first model approved by the backend.
export function pickMaveGatewayDefaultModelId(modelIds: string[]) {
	if (modelIds.length === 0) {
		return maveGatewayDefaultModelId
	}

	return modelIds.includes(maveGatewayDefaultModelId) ? maveGatewayDefaultModelId : modelIds[0]
}

export const MaveGateway = ({
	apiConfiguration,
	setApiConfigurationField,
	routerModels,
	organizationAllowList,
	modelValidationError,
	simplifySettings,
}: MaveGatewayProps) => {
	const backendModels = routerModels?.["mave-gateway"]
	const mavecodeModels = useMemo(() => {
		if (!backendModels || Object.keys(backendModels).length === 0) return openAiCodexModels
		return Object.fromEntries(
			Object.keys(backendModels).map((id) => [
				id,
				{ ...(openAiCodexModels[id as keyof typeof openAiCodexModels] ?? {}), ...backendModels[id] },
			]),
		)
	}, [backendModels])
	const modelIds = useMemo(() => Object.keys(mavecodeModels), [mavecodeModels])
	const resolvedDefaultModelId = useMemo(() => pickMaveGatewayDefaultModelId(modelIds), [modelIds])

	useEffect(() => {
		if (modelIds.length === 0) {
			return
		}

		const current = apiConfiguration.maveGatewayModelId
		if (!current || !modelIds.includes(current)) {
			setApiConfigurationField("maveGatewayModelId", resolvedDefaultModelId)
		}
	}, [apiConfiguration.maveGatewayModelId, modelIds, resolvedDefaultModelId, setApiConfigurationField])

	return (
		<>
			<OpenAICodexRateLimitDashboard isAuthenticated provider="maveCode" />
			<ModelPicker
				apiConfiguration={apiConfiguration}
				setApiConfigurationField={setApiConfigurationField}
				defaultModelId={resolvedDefaultModelId}
				models={mavecodeModels}
				modelIdKey="maveGatewayModelId"
				serviceName="MaveCode"
				serviceUrl={apiConfiguration.maveGatewayBaseUrl ?? ""}
				organizationAllowList={organizationAllowList}
				errorMessage={modelValidationError}
				simplifySettings={simplifySettings}
			/>
		</>
	)
}

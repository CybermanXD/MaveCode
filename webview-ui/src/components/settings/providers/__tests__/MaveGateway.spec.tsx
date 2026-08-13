import React from "react"
import { render, waitFor } from "@/utils/test-utils"
import type { ModelInfo, ProviderSettings, RouterModels } from "@roo-code/types"

import { MaveGateway, pickMaveGatewayDefaultModelId } from "../MaveGateway"

vi.mock("@src/i18n/TranslationContext", () => ({
	useAppTranslation: () => ({
		t: (key: string) => key,
	}),
}))

const extensionStateMock = {
	maveCodeIsAuthenticated: true,
	maveCodeUserEmail: "user@example.com",
	maveCodeUserName: "User",
	maveCodeBaseUrl: "https://www.mavecode.dev",
	uriScheme: "vscode",
	deviceName: "Test Device",
}

vi.mock("@src/context/ExtensionStateContext", () => ({
	useExtensionState: () => extensionStateMock,
}))

vi.mock("@src/oauth/urls", () => ({
	getMaveCodeAuthUrl: () => "https://www.mavecode.dev/dashboard/connect",
}))

vi.mock("../../ModelPicker", () => ({
	ModelPicker: ({ defaultModelId }: { defaultModelId: string }) => (
		<div data-testid="model-picker" data-default-model={defaultModelId} />
	),
}))

const baseInfo: ModelInfo = {
	maxTokens: 8192,
	contextWindow: 200000,
	supportsImages: false,
	supportsPromptCache: false,
	inputPrice: 1,
	outputPrice: 2,
}

function buildRouterModels(modelIds: string[]): RouterModels {
	const models = Object.fromEntries(modelIds.map((id) => [id, baseInfo]))
	return { "mave-gateway": models } as unknown as RouterModels
}

describe("pickMaveGatewayDefaultModelId", () => {
	it("falls back to the static default when the catalog is empty", () => {
		expect(pickMaveGatewayDefaultModelId([])).toBe("gpt-5.6-sol")
	})

	it("prefers the managed Codex default when it is available", () => {
		const result = pickMaveGatewayDefaultModelId(["gpt-5.3-codex", "gpt-5.6-sol", "gpt-5.4"])
		expect(result).toBe("gpt-5.6-sol")
	})

	it("falls back to the first available Codex id when the managed default is absent", () => {
		const result = pickMaveGatewayDefaultModelId(["gpt-5.3-codex", "gpt-5.4-mini"])
		expect(result).toBe("gpt-5.3-codex")
	})
})

describe("MaveGateway component", () => {
	const baseProps = {
		organizationAllowList: { allowAll: true, providers: {} } as ProviderSettings extends never ? never : any,
		setApiConfigurationField: vi.fn(),
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it("auto-selects the resolved default model when the profile has no model id", async () => {
		const setApiConfigurationField = vi.fn()
		render(
			<MaveGateway
				apiConfiguration={{ apiProvider: "mave-gateway" } as ProviderSettings}
				setApiConfigurationField={setApiConfigurationField}
				routerModels={buildRouterModels(["gpt-5.3-codex", "gpt-5.6-sol"])}
				organizationAllowList={baseProps.organizationAllowList}
			/>,
		)

		await waitFor(() => {
			expect(setApiConfigurationField).toHaveBeenCalledWith("maveGatewayModelId", "gpt-5.6-sol")
		})
	})

	it("reassigns a stale model id that is not in the catalog", async () => {
		const setApiConfigurationField = vi.fn()
		render(
			<MaveGateway
				apiConfiguration={
					{
						apiProvider: "mave-gateway",
						maveGatewayModelId: "obsolete-model",
					} as ProviderSettings
				}
				setApiConfigurationField={setApiConfigurationField}
				routerModels={buildRouterModels(["gpt-5.3-codex", "gpt-5.6-sol"])}
				organizationAllowList={baseProps.organizationAllowList}
			/>,
		)

		await waitFor(() => {
			expect(setApiConfigurationField).toHaveBeenCalledWith("maveGatewayModelId", "gpt-5.6-sol")
		})
	})

	it("does not overwrite a model id that is already valid for the catalog", async () => {
		const setApiConfigurationField = vi.fn()
		render(
			<MaveGateway
				apiConfiguration={
					{
						apiProvider: "mave-gateway",
						maveGatewayModelId: "gpt-5.3-codex",
					} as ProviderSettings
				}
				setApiConfigurationField={setApiConfigurationField}
				routerModels={buildRouterModels(["gpt-5.3-codex", "gpt-5.6-sol"])}
				organizationAllowList={baseProps.organizationAllowList}
			/>,
		)

		await waitFor(() => {
			expect(setApiConfigurationField).not.toHaveBeenCalled()
		})
	})

	it("uses static Codex metadata while the backend catalog is loading", async () => {
		const setApiConfigurationField = vi.fn()
		render(
			<MaveGateway
				apiConfiguration={{ apiProvider: "mave-gateway" } as ProviderSettings}
				setApiConfigurationField={setApiConfigurationField}
				routerModels={undefined}
				organizationAllowList={baseProps.organizationAllowList}
			/>,
		)

		await waitFor(() => {
			expect(setApiConfigurationField).toHaveBeenCalledWith("maveGatewayModelId", "gpt-5.6-sol")
		})
	})
})

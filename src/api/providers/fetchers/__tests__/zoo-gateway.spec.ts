// npx vitest run src/api/providers/fetchers/__tests__/mave-gateway.spec.ts

import type { ApiHandlerOptions } from "../../../../shared/api"

import { getMaveGatewayModels, parseMaveGatewayModel } from "../mave-gateway"

const { mockAction, mockGetCachedToken, mockRedactError } = vitest.hoisted(() => ({
	mockAction: vitest.fn(),
	mockGetCachedToken: vitest.fn<() => string>(),
	mockRedactError: vitest.fn<(error: unknown) => string>(),
}))

vitest.mock("../../../../services/mave-code-auth", () => ({
	getCachedMaveCodeToken: mockGetCachedToken,
}))

vitest.mock("../../../../services/mavecode-appscript-client", () => ({
	MaveCodeAppsScriptClient: class {
		action = mockAction
	},
	redactMaveCodeError: mockRedactError,
}))

describe("Mave Gateway Fetchers", () => {
	beforeEach(() => {
		vitest.clearAllMocks()
		mockGetCachedToken.mockReturnValue("")
		mockRedactError.mockReturnValue("request failed")
	})

	describe("getMaveGatewayModels", () => {
		const baseUrl = "https://example.test/exec"
		const token = "mave_ext_test_token"
		const options: ApiHandlerOptions = { maveGatewayBaseUrl: baseUrl }

		it("requests the managed catalog with the cached session token", async () => {
			mockGetCachedToken.mockReturnValue(token)
			mockAction.mockResolvedValueOnce({
				models: [
					{
						id: "managed/codex",
						displayName: "Managed Codex",
						capabilities: { input: ["text"], output: ["text"] },
					},
				],
			})

			const models = await getMaveGatewayModels(options)

			expect(mockAction).toHaveBeenCalledWith("models", { sessionToken: token })
			expect(models).toEqual({
				"managed/codex": expect.objectContaining({
					maxTokens: 4096,
					contextWindow: 128_000,
					description: "Managed MaveCode model managed/codex",
				}),
			})
		})

		it("skips the request when no cached session token is available", async () => {
			await expect(getMaveGatewayModels(options)).resolves.toEqual({})
			expect(mockAction).not.toHaveBeenCalled()
		})

		it("skips the request when no gateway base URL is configured", async () => {
			mockGetCachedToken.mockReturnValue(token)

			await expect(getMaveGatewayModels()).resolves.toEqual({})
			expect(mockAction).not.toHaveBeenCalled()
		})

		it("returns an empty catalog and logs only the redacted error", async () => {
			mockGetCachedToken.mockReturnValue(token)
			const failure = Object.assign(new Error("secret transport failure"), {
				config: { headers: { Authorization: "Bearer should-never-be-logged" } },
			})
			mockAction.mockRejectedValueOnce(failure)
			const consoleErrorSpy = vitest.spyOn(console, "error").mockImplementation(() => undefined)

			await expect(getMaveGatewayModels(options)).resolves.toEqual({})

			expect(mockRedactError).toHaveBeenCalledWith(failure)
			expect(consoleErrorSpy).toHaveBeenCalledWith("Error fetching MaveCode models: request failed")
			const logged = consoleErrorSpy.mock.calls.flat().map(String).join("\n")
			expect(logged).not.toContain("should-never-be-logged")
			expect(logged).not.toContain("Authorization")
			consoleErrorSpy.mockRestore()
		})
	})

	describe("parseMaveGatewayModel", () => {
		it("returns conservative defaults for a managed model", () => {
			expect(parseMaveGatewayModel({ id: "managed/codex" })).toEqual({
				maxTokens: 4096,
				contextWindow: 128_000,
				supportsImages: false,
				supportsPromptCache: false,
				description: "Managed MaveCode model managed/codex",
			})
		})
	})
})

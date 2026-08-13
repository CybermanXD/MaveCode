vi.mock("vscode", () => ({
	window: { showInformationMessage: vi.fn(), showErrorMessage: vi.fn() },
}))

import * as vscode from "vscode"

const { mockGetVisibleInstance, mockGetAllInstances, mockHandleAuthCallback, mockGetToken, provider } = vi.hoisted(() => {
	const provider = {
		handleOpenRouterCallback: vi.fn(),
		handleRequestyCallback: vi.fn(),
		handleMaveCodeCallback: vi.fn(),
		revealAuthenticatedWebview: vi.fn(),
	} as any
	return {
		mockGetVisibleInstance: vi.fn(() => provider),
		mockGetAllInstances: vi.fn(() => [provider]),
		mockHandleAuthCallback: vi.fn(),
		mockGetToken: vi.fn(() => "mave_ext_exchanged_session_12345"),
		provider,
	}
})

vi.mock("../../core/webview/ClineProvider", () => ({
	ClineProvider: { getVisibleInstance: mockGetVisibleInstance, getAllInstances: mockGetAllInstances },
}))

vi.mock("../../services/mave-code-auth", () => ({
	handleAuthCallback: mockHandleAuthCallback,
	getCachedMaveCodeToken: mockGetToken,
}))

import { handleUri } from "../handleUri"

describe("handleUri", () => {
	beforeEach(() => {
		vi.clearAllMocks()
		mockGetVisibleInstance.mockReturnValue(provider)
		mockGetAllInstances.mockReturnValue([provider])
		mockGetToken.mockReturnValue("mave_ext_exchanged_session_12345")
	})

	it("ignores the inherited cloud callback", async () => {
		await handleUri({ path: "/auth/clerk/callback", query: "code=legacy" } as any)
		expect(vscode.window.showInformationMessage).toHaveBeenCalled()
	})

	it("exchanges code and state, propagates the resulting session, and reveals the main UI", async () => {
		mockHandleAuthCallback.mockResolvedValue(true)
		await handleUri({ path: "/auth-callback", query: "code=mave_code_abcdefghijklmnopqrstuvwxyz&state=transaction_state" } as any)

		expect(mockHandleAuthCallback).toHaveBeenCalledWith("mave_code_abcdefghijklmnopqrstuvwxyz", "transaction_state")
		expect(provider.handleMaveCodeCallback).toHaveBeenCalledWith("mave_ext_exchanged_session_12345")
		expect(provider.revealAuthenticatedWebview).toHaveBeenCalled()
		expect(vscode.window.showInformationMessage).toHaveBeenCalledWith("Signed in to MaveCode.")
	})

	it("requires both code and state", async () => {
		await handleUri({ path: "/auth-callback", query: "code=mave_code_abcdefghijklmnopqrstuvwxyz" } as any)
		expect(mockHandleAuthCallback).not.toHaveBeenCalled()
	})

	it("does not reveal the main UI when exchange validation fails", async () => {
		mockHandleAuthCallback.mockResolvedValue(false)
		await handleUri({ path: "/auth-callback", query: "code=mave_code_abcdefghijklmnopqrstuvwxyz&state=wrong_state" } as any)

		expect(provider.handleMaveCodeCallback).not.toHaveBeenCalled()
		expect(provider.revealAuthenticatedWebview).not.toHaveBeenCalled()
		expect(vscode.window.showErrorMessage).toHaveBeenCalled()
	})

	it("serializes session persistence across provider instances", async () => {
		mockHandleAuthCallback.mockResolvedValue(true)
		const order: string[] = []
		const makeProvider = (name: string) => ({
			handleMaveCodeCallback: vi.fn(async () => {
				order.push(`${name}:start`)
				await new Promise((resolve) => setTimeout(resolve, 0))
				order.push(`${name}:end`)
			}),
			revealAuthenticatedWebview: vi.fn(),
		}) as any
		mockGetAllInstances.mockReturnValue([makeProvider("a"), makeProvider("b")])

		await handleUri({ path: "/auth-callback", query: "code=mave_code_abcdefghijklmnopqrstuvwxyz&state=transaction_state" } as any)
		expect(order).toEqual(["a:start", "a:end", "b:start", "b:end"])
	})
})

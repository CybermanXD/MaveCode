import * as vscode from "vscode"

import { getRouterUnavailableSignInMessage } from "../core/config/routerRemoval"
import { ClineProvider } from "../core/webview/ClineProvider"
import { handleAuthCallback as handleMaveCodeAuthCallback } from "../services/mave-code-auth"

/**
 * Persist the MaveCode session token to every active provider instance.
 *
 * The profile settings write (handleMaveCodeCallback) must run on any active
 * instance — not just the visible one — so the mave-gateway maveSessionToken is
 * persisted even when the sidebar/panel is hidden at callback time.
 *
 * Run sequentially (NOT Promise.all): each ClineProvider's handleMaveCodeCallback
 * does a read-modify-write on the same backing provider settings store
 * (listConfig → getProfile → saveConfig / upsertProviderProfile). Fanning out
 * concurrently across N instances can interleave reads/writes and clobber
 * updates. Serialization is cheap (at most a handful of instances) and avoids
 * the race.
 */
async function propagateMaveGatewayCallback(token: string): Promise<void> {
	const allInstances = ClineProvider.getAllInstances()
	for (const instance of allInstances) {
		try {
			await instance.handleMaveCodeCallback(token)
		} catch (error) {
			console.error(
				"Failed to persist MaveCode session for a provider instance:",
				error instanceof Error ? error.message : error,
			)
		}
	}
}

export const handleUri = async (uri: vscode.Uri) => {
	const path = uri.path
	const query = new URLSearchParams(uri.query.replace(/\+/g, "%2B"))
	const visibleProvider = ClineProvider.getVisibleInstance()

	switch (path) {
		case "/openrouter": {
			if (!visibleProvider) return
			const code = query.get("code")
			if (code) {
				await visibleProvider.handleOpenRouterCallback(code)
			}
			break
		}
		case "/requesty": {
			if (!visibleProvider) return
			const code = query.get("code")
			const baseUrl = query.get("baseUrl")
			if (code) {
				await visibleProvider.handleRequestyCallback(code, baseUrl)
			}
			break
		}
		case "/auth/clerk/callback": {
			vscode.window.showInformationMessage(getRouterUnavailableSignInMessage())
			break
		}
		case "/auth-callback": {
			const code = query.get("code")
			const state = query.get("state")
			if (code && state) {
				const success = await handleMaveCodeAuthCallback(code, state)
				if (success) {
					// Replace the sign-in home immediately. Profile synchronization can
					// perform storage work and must not leave the UI looking stuck.
					for (const instance of ClineProvider.getAllInstances()) {
						await instance.revealAuthenticatedWebview()
					}
					const { getCachedMaveCodeToken } = await import("../services/mave-code-auth")
					const token = getCachedMaveCodeToken()
					if (token) await propagateMaveGatewayCallback(token)
					void vscode.window.showInformationMessage("Signed in to MaveCode.")
				} else {
					void vscode.window.showErrorMessage("MaveCode sign-in could not be completed. Please try again.")
				}
			}
			break
		}
		default:
			break
	}
}

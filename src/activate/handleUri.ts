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
	console.info(`[MaveCode Auth] Profile propagation started providerInstances=${allInstances.length}`)
	for (const [index, instance] of allInstances.entries()) {
		const startedAt = Date.now()
		try {
			await instance.handleMaveCodeCallback(token)
			console.info(`[MaveCode Auth] Profile propagation completed providerIndex=${index} elapsedMs=${Date.now() - startedAt}`)
		} catch (error) {
			console.error(
				`[MaveCode Auth] Profile propagation failed providerIndex=${index} elapsedMs=${Date.now() - startedAt}:`,
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
			const callbackStartedAt = Date.now()
			const code = query.get("code")
			const state = query.get("state")
			const providerCountAtReceipt = ClineProvider.getAllInstances().length
			console.info(
				`[MaveCode Auth] URI callback received codePresent=${Boolean(code)} statePresent=${Boolean(state)} providerInstances=${providerCountAtReceipt} visibleProvider=${Boolean(visibleProvider)}`,
			)
			if (code && state) {
				const success = await handleMaveCodeAuthCallback(code, state)
				if (success) {
					const instances = ClineProvider.getAllInstances()
					const { getCachedMaveCodeToken } = await import("../services/mave-code-auth")
					const token = getCachedMaveCodeToken()
					// Persist and activate the provider before loading the authenticated app.
					// Otherwise React can hydrate against an authenticated token paired with an
					// incomplete provider configuration and render an empty setup-gated view.
					if (token) await propagateMaveGatewayCallback(token)
					console.info(`[MaveCode Auth] Revealing authenticated webviews count=${instances.length}`)
					for (const instance of instances) {
						await instance.revealAuthenticatedWebview()
					}
					console.info(
						`[MaveCode Auth] URI callback completed tokenPresent=${Boolean(token)} providerInstances=${instances.length} elapsedMs=${Date.now() - callbackStartedAt}`,
					)
					void vscode.window.showInformationMessage("Signed in to MaveCode.")
				} else {
					void vscode.window.showErrorMessage("MaveCode sign-in could not be completed. Please try again.")
				}
			} else {
				console.warn("[MaveCode Auth] URI callback ignored because code or state is missing")
			}
			break
		}
		default:
			break
	}
}

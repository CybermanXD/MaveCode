import { useCallback, useEffect, useRef } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { type ExtensionMessage, type RouterModels, providerIdentifiers } from "@roo-code/types"

import { useExtensionState } from "@src/context/ExtensionStateContext"

import { fetchRouterModels } from "./useRouterModels"

/**
 * Keeps mave-gateway models in the shared routerModels query fresh when credentials
 * become available (sign-in or profile seeding) without coupling auth to modelCache.
 */
export function useMaveGatewayRouterModelsSync() {
	const queryClient = useQueryClient()
	const { maveCodeIsAuthenticated } = useExtensionState()
	const wasAuthenticatedRef = useRef<boolean | undefined>(undefined)

	const syncMaveGatewayModels = useCallback(async () => {
		if (!maveCodeIsAuthenticated) {
			return
		}

		try {
			const partial = await fetchRouterModels(providerIdentifiers.maveGateway)
			const zooModels = partial[providerIdentifiers.maveGateway]
			if (!zooModels || Object.keys(zooModels).length === 0) {
				return
			}

			queryClient.setQueryData<RouterModels>(["routerModels", "all"], (current) =>
				current ? { ...current, [providerIdentifiers.maveGateway]: zooModels } : partial,
			)
		} catch {
			// Ignore: bulk router fetch may still be in flight.
		}
	}, [queryClient, maveCodeIsAuthenticated])

	useEffect(() => {
		const onMessage = (event: MessageEvent) => {
			const message = event.data as ExtensionMessage
			if (message.type === "maveGatewayCredentialsReady") {
				void syncMaveGatewayModels()
			}
		}

		window.addEventListener("message", onMessage)
		return () => window.removeEventListener("message", onMessage)
	}, [syncMaveGatewayModels])

	useEffect(() => {
		const wasAuthenticated = wasAuthenticatedRef.current
		wasAuthenticatedRef.current = maveCodeIsAuthenticated

		if (maveCodeIsAuthenticated && wasAuthenticated === false) {
			void syncMaveGatewayModels()
		}
	}, [maveCodeIsAuthenticated, syncMaveGatewayModels])
}

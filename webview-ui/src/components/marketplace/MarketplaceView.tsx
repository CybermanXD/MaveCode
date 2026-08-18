import { useState, useEffect, useMemo, useContext } from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, RefreshCw } from "lucide-react"
import { Tab, TabContent, TabHeader } from "../common/Tab"
import { MarketplaceViewStateManager } from "./MarketplaceViewStateManager"
import { useStateManager } from "./useStateManager"
import { useAppTranslation } from "@/i18n/TranslationContext"
import { vscode } from "@/utils/vscode"
import { MarketplaceListView } from "./MarketplaceListView"
import { TooltipProvider } from "@/components/ui/tooltip"
import { ExtensionStateContext } from "@/context/ExtensionStateContext"

interface MarketplaceViewProps {
	onDone?: () => void
	stateManager: MarketplaceViewStateManager
	targetTab?: "mcp" | "persona"
}
export function MarketplaceView({ stateManager, onDone, targetTab }: MarketplaceViewProps) {
	const { t } = useAppTranslation()
	const [state, manager] = useStateManager(stateManager)
	const [hasReceivedInitialState, setHasReceivedInitialState] = useState(false)
	const [isRefreshing, setIsRefreshing] = useState(false)
	const extensionState = useContext(ExtensionStateContext)
	const [lastOrganizationSettingsVersion, setLastOrganizationSettingsVersion] = useState<number>(
		extensionState?.organizationSettingsVersion ?? -1,
	)

	useEffect(() => {
		const handleRefreshState = (event: MessageEvent) => {
			if (event.data?.type === "marketplaceRefreshState") setIsRefreshing(Boolean(event.data.bool))
		}
		window.addEventListener("message", handleRefreshState)
		return () => window.removeEventListener("message", handleRefreshState)
	}, [])

	useEffect(() => {
		const currentVersion = extensionState?.organizationSettingsVersion ?? -1
		if (currentVersion !== lastOrganizationSettingsVersion) {
			vscode.postMessage({
				type: "fetchMarketplaceData",
			})
		}
		setLastOrganizationSettingsVersion(currentVersion)
	}, [extensionState?.organizationSettingsVersion, lastOrganizationSettingsVersion])

	// Track when we receive the initial state
	useEffect(() => {
		// Check if we already have items (state might have been received before mount)
		if (state.allItems.length > 0 && !hasReceivedInitialState) {
			setHasReceivedInitialState(true)
		}
	}, [state.allItems, hasReceivedInitialState])

	useEffect(() => {
		if (targetTab && (targetTab === "mcp" || targetTab === "persona")) {
			manager.transition({ type: "SET_ACTIVE_TAB", payload: { tab: targetTab } })
		}
	}, [targetTab, manager])

	// Ensure marketplace state manager processes messages when component mounts
	useEffect(() => {
		// When the marketplace view first mounts, we need to trigger a state update
		// to ensure we get the current marketplace items. We do this by sending
		// a filter message with empty filters, which will cause the extension to
		// send back the full state including all marketplace items.
		if (!hasReceivedInitialState && state.allItems.length === 0) {
			// Fetch marketplace data on demand
			// Note: isFetching is already true by default for initial load
			vscode.postMessage({
				type: "fetchMarketplaceData",
			})
		}

		// Listen for state changes to know when initial data arrives
		const unsubscribe = manager.onStateChange((newState) => {
			// Mark as received initial state when we get any state update
			// This prevents infinite loops and ensures proper state handling
			if (!hasReceivedInitialState && (newState.allItems.length > 0 || newState.displayItems !== undefined)) {
				setHasReceivedInitialState(true)
			}
		})

		const handleVisibilityMessage = (event: MessageEvent) => {
			const message = event.data
			if (message.type === "webviewVisible" && message.visible === true) {
				// Data will be automatically fresh when panel becomes visible
				// No manual fetching needed since we removed caching
			}
		}

		window.addEventListener("message", handleVisibilityMessage)
		return () => {
			window.removeEventListener("message", handleVisibilityMessage)
			unsubscribe()
		}
	}, [manager, hasReceivedInitialState, state.allItems.length])

	// Memoize all available tags
	const allTags = useMemo(
		() => Array.from(new Set(state.allItems.flatMap((item) => item.tags || []))).sort(),
		[state.allItems],
	)

	// Memoize filtered tags
	const filteredTags = useMemo(() => allTags, [allTags])

	return (
		<TooltipProvider delayDuration={300}>
			<Tab>
				<TabHeader className="flex flex-col sticky top-0 z-10 px-3 py-2">
					<div className="flex items-center justify-between gap-2 px-2">
						<div className="flex items-center gap-2">
							<Button
								variant="ghost"
								className="px-1.5 -ml-2"
								onClick={() => onDone?.()}
								aria-label={t("settings:back")}>
								<ArrowLeft />
								<span className="sr-only">{t("settings:back")}</span>
							</Button>
							<h3 className="font-bold m-0">{t("marketplace:title")}</h3>
						</div>
						<Button
							variant="ghost"
							disabled={isRefreshing}
							onClick={() => vscode.postMessage({ type: "refreshMarketplaceData" })}
							aria-label="Refresh Marketplace">
							<RefreshCw className={isRefreshing ? "animate-spin" : ""} />
							<span>Refresh</span>
						</Button>
					</div>
					<div className="flex gap-1 px-2 pt-2 border-b border-vscode-panel-border">
						{(["mcp", "persona"] as const).map((tab) => (
							<Button
								key={tab}
								variant="ghost"
								className={`rounded-none px-3 pb-2 border-b-2 ${state.activeTab === tab ? "border-vscode-focusBorder text-vscode-foreground" : "border-transparent text-vscode-descriptionForeground"}`}
								onClick={() => manager.transition({ type: "SET_ACTIVE_TAB", payload: { tab } })}>
								{tab === "mcp" ? "MCP" : "Personas"}
							</Button>
						))}
					</div>
				</TabHeader>

				<TabContent className="p-3 pt-2">
					<MarketplaceListView
						stateManager={stateManager}
						allTags={allTags}
						filteredTags={filteredTags}
						filterByType={state.activeTab}
					/>
				</TabContent>
			</Tab>
		</TooltipProvider>
	)
}

import * as fs from "fs/promises"
import * as path from "path"

import * as vscode from "vscode"
import * as yaml from "yaml"

import type { MarketplaceItem, MarketplaceItemType } from "@roo-code/types"
import { TelemetryService } from "@roo-code/telemetry"

import { GlobalFileNames } from "../../shared/globalFileNames"
import { ensureSettingsDirectoryExists } from "../../utils/globalContext"
import { t } from "../../i18n"
import type { CustomModesManager } from "../../core/config/CustomModesManager"
import { RemotePersonaManager } from "../personas/RemotePersonaManager"

import { ConfigLoader } from "./ConfigLoader"
import { RemoteMcpManager } from "./RemoteMcpManager"
import { SimpleInstaller } from "./SimpleInstaller"

export interface MarketplaceItemsResponse {
	organizationMcps: MarketplaceItem[]
	marketplaceItems: MarketplaceItem[]
	errors?: string[]
}

export interface MarketplaceRefreshResult extends MarketplaceItemsResponse {
	changed: boolean
}

const createComingSoonPersona = (id: string, name: string, description: string, tags: string[]): MarketplaceItem => ({
	id,
	name: `${name} [Coming Soon]`,
	description: `${description} This persona is disabled until a future MaveCode release.`,
	type: "persona",
	author: "MaveCode",
	tags: ["coming soon", ...tags],
	status: "coming-soon",
	version: "0.0.0",
	packageUrl: "https://github.com/arkofheavean/MaveCode/releases",
	sha256: "0".repeat(64),
	packageSize: 1,
	signingKeyId: "mavecode-marketplace-2026-01",
	minimumMaveCodeVersion: "999.0.0",
})

const COMING_SOON_PERSONAS: MarketplaceItem[] = [
	createComingSoonPersona("architect", "🏗️ Architect", "Plan and design before implementation.", ["planning"]),
	createComingSoonPersona("debug", "🪲 Debug", "Diagnose and fix software issues.", ["debugging"]),
	createComingSoonPersona("orchestrator", "🪃 Orchestrator", "Coordinate tasks across multiple modes.", ["workflow"]),
]

export class MarketplaceManager {
	private configLoader: ConfigLoader
	private installer: SimpleInstaller
	private remotePersonaManager: RemotePersonaManager
	private remoteMcpManager: RemoteMcpManager
	private refreshPromise?: Promise<MarketplaceRefreshResult>

	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly customModesManager?: CustomModesManager,
	) {
		this.configLoader = new ConfigLoader(context.extensionUri.fsPath)
		this.installer = new SimpleInstaller(context, customModesManager)
		this.remotePersonaManager = new RemotePersonaManager(context.globalStorageUri.fsPath)
		this.remoteMcpManager = new RemoteMcpManager(
			context.globalStorageUri.fsPath,
			String(context.extension?.packageJSON?.version ?? "0.0.0"),
		)
	}

	async refreshRemoteMarketplace(options: { force?: boolean } = {}): Promise<MarketplaceRefreshResult> {
		if (this.refreshPromise) return this.refreshPromise
		this.refreshPromise = (async () => {
			const [personasChanged, mcpsChanged] = await Promise.all([
				this.remotePersonaManager.refresh(options),
				this.remoteMcpManager.refresh(options),
			])
			if (personasChanged) this.customModesManager?.invalidateCache()
			return { ...(await this.getMarketplaceItems()), changed: personasChanged || mcpsChanged }
		})().finally(() => {
			this.refreshPromise = undefined
		})
		return this.refreshPromise
	}

	async getMarketplaceItems(): Promise<MarketplaceItemsResponse> {
		try {
			const [localItems, personaItems, remoteMcpItems] = await Promise.all([
				this.configLoader.loadAllItems(),
				this.remotePersonaManager.getMarketplaceItems(),
				this.remoteMcpManager.getMarketplaceItems(),
			])
			const remoteMcpIds = new Set(remoteMcpItems.map((item) => item.id))
			const bundledMcpFallbacks = localItems.filter((item) => item.type === "mcp" && !remoteMcpIds.has(item.id))
			const marketplaceItems = [
				...personaItems,
				...COMING_SOON_PERSONAS,
				...remoteMcpItems,
				...bundledMcpFallbacks,
			]

			return {
				organizationMcps: [],
				marketplaceItems,
			}
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			console.error("Failed to load marketplace items:", error)

			return {
				organizationMcps: [],
				marketplaceItems: [],
				errors: [errorMessage],
			}
		}
	}

	async getCurrentItems(): Promise<MarketplaceItem[]> {
		const result = await this.getMarketplaceItems()
		return [...result.organizationMcps, ...result.marketplaceItems]
	}

	filterItems(
		items: MarketplaceItem[],
		filters: { type?: MarketplaceItemType; search?: string; tags?: string[] },
	): MarketplaceItem[] {
		return items.filter((item) => {
			// Type filter
			if (filters.type && item.type !== filters.type) {
				return false
			}

			// Search filter
			if (filters.search) {
				const searchTerm = filters.search.toLowerCase()
				const searchableText = `${item.name} ${item.description}`.toLowerCase()
				if (!searchableText.includes(searchTerm)) {
					return false
				}
			}

			// Tags filter
			if (filters.tags?.length) {
				if (!item.tags?.some((tag) => filters.tags!.includes(tag))) {
					return false
				}
			}

			return true
		})
	}

	async updateWithFilteredItems(filters: {
		type?: MarketplaceItemType
		search?: string
		tags?: string[]
	}): Promise<MarketplaceItem[]> {
		const allItems = await this.getCurrentItems()

		if (!filters.type && !filters.search && (!filters.tags || filters.tags.length === 0)) {
			return allItems
		}

		return this.filterItems(allItems, filters)
	}

	async installMarketplaceItem(
		item: MarketplaceItem,
		options?: { target?: "global" | "project"; parameters?: Record<string, any> },
	): Promise<string> {
		if (item.status === "coming-soon") {
			throw new Error(`${item.name} is coming soon and cannot be enabled yet.`)
		}

		const { target = "project", parameters } = options || {}

		vscode.window.showInformationMessage(t("marketplace:installation.installing", { itemName: item.name }))

		try {
			if (item.type === "persona") {
				await this.remotePersonaManager.getPersonas()
				vscode.window.showInformationMessage(
					t("marketplace:installation.installSuccess", { itemName: item.name }),
				)
				return this.context.globalStorageUri.fsPath
			}
			const result = await this.installer.installItem(item, { target, parameters })
			vscode.window.showInformationMessage(t("marketplace:installation.installSuccess", { itemName: item.name }))

			// Capture telemetry for successful installation
			const telemetryProperties: Record<string, any> = {}
			if (parameters && Object.keys(parameters).length > 0) {
				telemetryProperties.hasParameters = true
				// For MCP items with multiple installation methods, track which one was used
				if (item.type === "mcp" && parameters._selectedIndex !== undefined && Array.isArray(item.content)) {
					const selectedMethod = item.content[parameters._selectedIndex]
					if (selectedMethod && selectedMethod.name) {
						telemetryProperties.installationMethodName = selectedMethod.name
					}
				}
			}

			TelemetryService.instance.captureMarketplaceItemInstalled(
				item.id,
				item.type,
				item.name,
				target,
				telemetryProperties,
			)

			// Open the config file that was modified, optionally at the specific line
			const document = await vscode.workspace.openTextDocument(result.filePath)
			const options: vscode.TextDocumentShowOptions = {}

			if (result.line !== undefined) {
				// Position cursor at the line where content was added
				options.selection = new vscode.Range(result.line - 1, 0, result.line - 1, 0)
			}

			await vscode.window.showTextDocument(document, options)

			return result.filePath
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			vscode.window.showErrorMessage(
				t("marketplace:installation.installError", { itemName: item.name, errorMessage }),
			)
			throw error
		}
	}

	async setManagedPersonaEnabled(item: MarketplaceItem, enabled: boolean): Promise<void> {
		if (item.type !== "persona") throw new Error("Only managed personas can be enabled or disabled.")
		if (item.status === "coming-soon") throw new Error(`${item.name} is coming soon and cannot be enabled yet.`)
		if (!this.customModesManager) throw new Error("Managed persona settings are unavailable.")
		await this.customModesManager.setManagedPersonaEnabled(item.id, enabled)
	}

	async removeInstalledMarketplaceItem(
		item: MarketplaceItem,
		options?: { target?: "global" | "project" },
	): Promise<void> {
		const { target = "project" } = options || {}

		vscode.window.showInformationMessage(t("marketplace:installation.removing", { itemName: item.name }))

		try {
			if (item.type === "persona") {
				throw new Error(`Managed persona '${item.id}' cannot be removed.`)
			}
			await this.installer.removeItem(item, { target })
			vscode.window.showInformationMessage(t("marketplace:installation.removeSuccess", { itemName: item.name }))

			// Capture telemetry for successful removal
			TelemetryService.instance.captureMarketplaceItemRemoved(item.id, item.type, item.name, target)
		} catch (error) {
			const errorMessage = error instanceof Error ? error.message : String(error)
			vscode.window.showErrorMessage(
				t("marketplace:installation.removeError", { itemName: item.name, errorMessage }),
			)
			throw error
		}
	}

	async cleanup(): Promise<void> {
		// Bundled marketplace config has no runtime resources to release.
	}

	/**
	 * Get installation metadata by checking config files for installed items
	 */
	async getInstallationMetadata(): Promise<{
		project: Record<string, { type: string }>
		global: Record<string, { type: string }>
	}> {
		const metadata = {
			project: {} as Record<string, { type: string; enabled?: boolean; required?: boolean }>,
			global: {} as Record<string, { type: string; enabled?: boolean; required?: boolean }>,
		}
		const disabled = new Set(this.context.globalState.get<string[]>("mavecode.managedPersonas.disabled", []))
		for (const persona of await this.remotePersonaManager.getMarketplaceItems()) {
			const required = persona.id === "standard"
			metadata.global[persona.id] = { type: "persona", enabled: required || !disabled.has(persona.id), required }
		}

		// Check project-level installations
		await this.checkProjectInstallations(metadata.project)

		// Check global-level installations
		await this.checkGlobalInstallations(metadata.global)

		return metadata
	}

	/**
	 * Check for project-level installed items
	 */
	private async checkProjectInstallations(metadata: Record<string, { type: string }>): Promise<void> {
		try {
			const workspaceFolder = vscode.workspace.workspaceFolders?.[0]
			if (!workspaceFolder) {
				return // No workspace, no project installations
			}

			// Check modes in .roomodes
			const projectModesPath = path.join(workspaceFolder.uri.fsPath, ".roomodes")
			try {
				const content = await fs.readFile(projectModesPath, "utf-8")
				const data = yaml.parse(content)
				if (data?.customModes && Array.isArray(data.customModes)) {
					for (const mode of data.customModes) {
						if (mode.slug) {
							metadata[mode.slug] = {
								type: "mode",
							}
						}
					}
				}
			} catch (error) {
				// File doesn't exist or can't be read, skip
			}

			// Check MCPs in .roo/mcp.json
			const projectMcpPath = path.join(workspaceFolder.uri.fsPath, ".roo", "mcp.json")
			try {
				const content = await fs.readFile(projectMcpPath, "utf-8")
				const data = JSON.parse(content)
				if (data?.mcpServers && typeof data.mcpServers === "object") {
					for (const serverName of Object.keys(data.mcpServers)) {
						metadata[serverName] = {
							type: "mcp",
						}
					}
				}
			} catch (error) {
				// File doesn't exist or can't be read, skip
			}
		} catch (error) {
			console.error("Error checking project installations:", error)
		}
	}

	/**
	 * Check for global-level installed items
	 */
	private async checkGlobalInstallations(metadata: Record<string, { type: string }>): Promise<void> {
		try {
			const globalSettingsPath = await ensureSettingsDirectoryExists(this.context)

			// Check global modes
			const globalModesPath = path.join(globalSettingsPath, GlobalFileNames.customModes)
			try {
				const content = await fs.readFile(globalModesPath, "utf-8")
				const data = yaml.parse(content)
				if (data?.customModes && Array.isArray(data.customModes)) {
					for (const mode of data.customModes) {
						if (mode.slug) {
							metadata[mode.slug] = {
								type: "mode",
							}
						}
					}
				}
			} catch (error) {
				// File doesn't exist or can't be read, skip
			}

			// Check global MCPs
			const globalMcpPath = path.join(globalSettingsPath, GlobalFileNames.mcpSettings)
			try {
				const content = await fs.readFile(globalMcpPath, "utf-8")
				const data = JSON.parse(content)
				if (data?.mcpServers && typeof data.mcpServers === "object") {
					for (const serverName of Object.keys(data.mcpServers)) {
						metadata[serverName] = {
							type: "mcp",
						}
					}
				}
			} catch (error) {
				// File doesn't exist or can't be read, skip
			}
		} catch (error) {
			console.error("Error checking global installations:", error)
		}
	}
}

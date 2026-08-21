import { access, readFile } from "node:fs/promises"
import path from "node:path"

/* global console */

const requiredAssets = [
	path.join("webview-ui", "build", "assets", "index.js"),
	path.join("webview-ui", "build", "assets", "index.css"),
	path.join("webview-ui", "build", "assets", "index.js.map"),
]

for (const asset of requiredAssets) {
	try {
		await access(asset)
	} catch {
		throw new Error(`Required packaged webview asset is missing: ${asset}`)
	}
}

const sourceMapPath = path.join("webview-ui", "build", "assets", "index.js.map")
const sourceMap = JSON.parse(await readFile(sourceMapPath, "utf8"))

const readSource = (fileName) => {
	const sourceIndex = sourceMap.sources.findIndex((source) => source.endsWith(fileName))
	if (sourceIndex < 0 || !sourceMap.sourcesContent?.[sourceIndex]) {
		throw new Error(`Required source is missing from packaged webview source map: ${fileName}`)
	}
	return sourceMap.sourcesContent[sourceIndex]
}

const settingsView = readSource("SettingsView.tsx")
const marketplaceView = readSource("MarketplaceView.tsx")
const marketplaceListView = readSource("MarketplaceListView.tsx")
const marketplaceItemCard = readSource("MarketplaceItemCard.tsx")
const app = readSource("App.tsx")
const chatView = readSource("ChatView.tsx")
const modeSelector = readSource("ModeSelector.tsx")

const requiredMaveCodeMarkers = [
	[settingsView.includes("setManagedSettingsInert"), "managed Settings disabled state"],
	[!settingsView.includes('{ id: "about", icon: Info }'), "reduced Settings navigation"],
	[marketplaceView.includes('["mcp", "persona"]'), "MCP/Personas Marketplace tabs"],
	[!marketplaceView.includes('["mcp", "mode"]'), "removal of the legacy MCP/Mode Marketplace tabs"],
	[!marketplaceListView.includes("IssueFooter"), "removal of the Marketplace issue footer"],
	[marketplaceItemCard.includes("Always enabled"), "required Standard persona control"],
	[marketplaceItemCard.includes("setManagedPersonaEnabled"), "managed persona enable/disable control"],
	[!chatView.includes("<Announcement"), "removal of the release-notes popup"],
	[chatView.includes("api.github.com/repos/arkofheavean/MaveCode/releases/latest"), "GitHub release update pill"],
	[modeSelector.includes("DISABLED_BUILT_IN_MODE_SLUGS"), "hard-disabled mode selector personas"],
	[marketplaceItemCard.includes("Coming soon"), "Coming Soon persona marketplace state"],
	[app.includes("didShowAnnouncement"), "silent release-announcement acknowledgement"],
]

for (const [isPresent, description] of requiredMaveCodeMarkers) {
	if (!isPresent) {
		throw new Error(`Packaged webview is stale or invalid: missing ${description}`)
	}
}

console.log("[assert-webview-build] Required and current MaveCode webview assets are present")

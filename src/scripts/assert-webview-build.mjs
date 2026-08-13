import { access } from "node:fs/promises"
import path from "node:path"

const requiredAssets = [
	path.join("webview-ui", "build", "assets", "index.js"),
	path.join("webview-ui", "build", "assets", "index.css"),
]

for (const asset of requiredAssets) {
	try {
		await access(asset)
	} catch {
		throw new Error(`Required packaged webview asset is missing: ${asset}`)
	}
}

console.log("[assert-webview-build] Required webview assets are present")

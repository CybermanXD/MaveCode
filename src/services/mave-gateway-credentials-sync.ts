import type { ExtensionMessage } from "@roo-code/types"

/** Notifies the webview that MaveCode credentials are available for model discovery. */
export function postMaveGatewayCredentialsReady(postMessage: (message: ExtensionMessage) => void): void {
	postMessage({ type: "maveGatewayCredentialsReady" })
}

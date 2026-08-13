import { MAVECODE_AUTH_CONFIG } from "./config.js"

const params = new URLSearchParams(location.search)
const transaction = {
	state: params.get("state") || "",
	codeChallenge: params.get("code_challenge") || "",
	callbackUri: params.get("callback_uri") || "",
}
const status = document.querySelector("#status")

function setStatus(message, kind = "") {
	status.textContent = message
	status.className = `status ${kind}`.trim()
}

function validOpaque(value) {
	return /^[A-Za-z0-9_-]{43,128}$/.test(value)
}

async function completeGoogleSignIn(response) {
	try {
		setStatus("Verifying your Google account…")
		const backend = await fetch(MAVECODE_AUTH_CONFIG.appsScriptUrl, {
			method: "POST",
			headers: { "Content-Type": "text/plain;charset=utf-8" },
			body: JSON.stringify({ action: "auth-google-complete", idToken: response.credential, ...transaction }),
		})
		const payload = await backend.json()
		if (!payload.ok) throw new Error(payload.error?.message || "This Google account is not allowed.")
		const result = payload.data
		setStatus("Approved. Returning to MaveCode…", "success")
		const callback = new URL(result.callbackUri)
		callback.searchParams.set("code", result.authorizationCode)
		callback.searchParams.set("state", result.state)
		location.assign(callback.toString())
	} catch (error) {
		setStatus(error instanceof Error ? error.message : "Sign-in failed.", "error")
	}
}

function initialize() {
	if (!validOpaque(transaction.state) || !validOpaque(transaction.codeChallenge) || !transaction.callbackUri.startsWith("vscode://")) {
		setStatus("This sign-in link is invalid or incomplete. Return to VS Code and try again.", "error")
		return
	}
	if (!globalThis.google?.accounts?.id) {
		setTimeout(initialize, 100)
		return
	}
	google.accounts.id.initialize({ client_id: MAVECODE_AUTH_CONFIG.googleClientId, callback: completeGoogleSignIn, auto_select: false, cancel_on_tap_outside: true })
	google.accounts.id.renderButton(document.querySelector("#google-button"), { theme: "filled_blue", size: "large", shape: "pill", text: "signin_with", width: 300 })
	setStatus("Choose an approved Google account.")
}

initialize()

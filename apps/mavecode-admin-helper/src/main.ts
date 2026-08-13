import { loadConfig } from "./config.js"
import { createHelperServer } from "./server.js"
import { redactSensitive } from "./security.js"

try {
	const config = loadConfig()
	const server = createHelperServer(config)
	server.listen(config.port, config.host, () => {
		const address = server.address()
		const port = typeof address === "object" && address ? address.port : config.port
		console.info(`MaveCode Admin Helper listening on http://${config.host}:${port}`)
		console.info(
			`Codex OAuth configured: redirect_uri=${config.redirectUri}, codex_cli_simplified_flow=true, originator=mave-code; listener remains ${config.host}`,
		)
	})
} catch (error) {
	console.error(redactSensitive(error instanceof Error ? error.message : String(error)))
	process.exitCode = 1
}

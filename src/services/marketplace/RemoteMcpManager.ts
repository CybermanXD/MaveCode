import { createPublicKey, verify } from "node:crypto"
import * as fs from "node:fs/promises"
import * as path from "node:path"

import { type McpMarketplaceItem, mcpMarketplaceItemSchema } from "@roo-code/types"

const CATALOG_URL = "https://arkofheavean.github.io/MaveCode/mcp-catalog-v1.json"
const KEY_ID = "mavecode-marketplace-2026-01"
const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000
const MAX_CATALOG_BYTES = 2 * 1024 * 1024
const MAX_ITEMS = 500
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEApi3b8BLwImWFo6PKVc5V9S0hsbqZnhp7qHo+to41PH8=
-----END PUBLIC KEY-----`

interface McpCatalog {
	schemaVersion: 1
	publishedAt: string
	sourceCommit: string
	minimumMaveCodeVersion: string
	items: Array<McpMarketplaceItem & { type: "mcp" }>
	signingKeyId: string
	signature?: string
}

const stable = (value: unknown): unknown => {
	if (Array.isArray(value)) return value.map(stable)
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.keys(value as Record<string, unknown>)
				.sort()
				.map((key) => [key, stable((value as Record<string, unknown>)[key])]),
		)
	}
	return value
}

const canonical = (value: unknown): string => JSON.stringify(stable(value))

const verifyCatalog = (catalog: McpCatalog): void => {
	if (catalog.signingKeyId !== KEY_ID || typeof catalog.signature !== "string") {
		throw new Error("MCP marketplace catalog has an untrusted signing key")
	}
	const { signature, ...signed } = catalog
	const valid = verify(
		null,
		Buffer.from(canonical(signed)),
		createPublicKey(PUBLIC_KEY),
		Buffer.from(signature, "base64"),
	)
	if (!valid) throw new Error("MCP marketplace catalog signature is invalid")
}

const fetchBounded = async (url: string): Promise<Buffer> => {
	const parsed = new URL(url)
	if (parsed.protocol !== "https:" || parsed.hostname !== "arkofheavean.github.io") {
		throw new Error("MCP marketplace URL is not trusted")
	}
	const response = await fetch(parsed, { signal: AbortSignal.timeout(15_000) })
	if (!response.ok) throw new Error(`MCP marketplace request failed with HTTP ${response.status}`)
	const declaredLength = Number(response.headers.get("content-length") || 0)
	if (declaredLength > MAX_CATALOG_BYTES) throw new Error("MCP marketplace catalog is too large")
	const bytes = Buffer.from(await response.arrayBuffer())
	if (bytes.length > MAX_CATALOG_BYTES) throw new Error("MCP marketplace catalog is too large")
	return bytes
}

const compareVersions = (left: string, right: string): number => {
	const parse = (value: string) =>
		value
			.split("-", 1)[0]
			.split(".")
			.map((part) => Number(part))
	const leftParts = parse(left)
	const rightParts = parse(right)
	if (leftParts.length !== 3 || rightParts.length !== 3 || [...leftParts, ...rightParts].some(Number.isNaN)) {
		throw new Error("MCP marketplace catalog has an invalid compatibility version")
	}
	for (let index = 0; index < 3; index++) {
		if (leftParts[index] !== rightParts[index]) return leftParts[index] - rightParts[index]
	}
	return 0
}

export class RemoteMcpManager {
	private readonly catalogPath: string
	private refreshPromise?: Promise<boolean>

	constructor(
		globalStoragePath: string,
		private readonly extensionVersion: string,
	) {
		this.catalogPath = path.join(globalStoragePath, "managed-marketplace", "mcp-catalog-v1.json")
	}

	async getMarketplaceItems(options: { force?: boolean } = {}): Promise<Array<McpMarketplaceItem & { type: "mcp" }>> {
		await this.refresh(options).catch((error) =>
			console.warn("[RemoteMcpManager] Using cached or bundled MCP listings:", error),
		)
		try {
			return (await this.readVerifiedCatalog()).items
		} catch {
			return []
		}
	}

	async refresh(options: { force?: boolean } = {}): Promise<boolean> {
		if (this.refreshPromise) return this.refreshPromise
		this.refreshPromise = this.performRefresh(Boolean(options.force)).finally(() => {
			this.refreshPromise = undefined
		})
		return this.refreshPromise
	}

	private async performRefresh(force: boolean): Promise<boolean> {
		const stat = await fs.stat(this.catalogPath).catch(() => undefined)
		if (!force && stat && Date.now() - stat.mtimeMs < REFRESH_INTERVAL_MS) return false
		const previous = await fs.readFile(this.catalogPath).catch(() => undefined)
		const bytes = await fetchBounded(CATALOG_URL)
		const catalog = this.parseCatalog(bytes)
		await this.atomicWrite(bytes)
		console.info(`[RemoteMcpManager] Activated ${catalog.items.length} verified MCP listings`)
		return !previous || !previous.equals(bytes)
	}

	private async readVerifiedCatalog(): Promise<McpCatalog> {
		return this.parseCatalog(await fs.readFile(this.catalogPath))
	}

	private parseCatalog(bytes: Buffer): McpCatalog {
		const catalog = JSON.parse(bytes.toString("utf8")) as McpCatalog
		if (
			catalog.schemaVersion !== 1 ||
			!Array.isArray(catalog.items) ||
			catalog.items.length > MAX_ITEMS ||
			typeof catalog.minimumMaveCodeVersion !== "string"
		) {
			throw new Error("Unsupported MCP marketplace catalog")
		}
		verifyCatalog(catalog)
		if (compareVersions(this.extensionVersion, catalog.minimumMaveCodeVersion) < 0) {
			throw new Error(`MCP marketplace requires MaveCode ${catalog.minimumMaveCodeVersion} or newer`)
		}
		const ids = new Set<string>()
		catalog.items = catalog.items.map((item) => {
			if (item.type !== "mcp" || ids.has(item.id)) throw new Error("Invalid or duplicate MCP marketplace item")
			ids.add(item.id)
			return { type: "mcp" as const, ...mcpMarketplaceItemSchema.parse(item) }
		})
		return catalog
	}

	private async atomicWrite(bytes: Buffer): Promise<void> {
		await fs.mkdir(path.dirname(this.catalogPath), { recursive: true })
		const temporary = `${this.catalogPath}.${process.pid}.${Date.now()}.tmp`
		await fs.writeFile(temporary, bytes, { flag: "wx" })
		await fs.rename(temporary, this.catalogPath).catch(async () => {
			await fs.rm(this.catalogPath, { force: true })
			await fs.rename(temporary, this.catalogPath)
		})
	}
}

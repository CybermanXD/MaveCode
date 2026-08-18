import { createHash, createPublicKey, verify } from "node:crypto"
import * as fs from "fs/promises"
import * as path from "path"

import { modeConfigSchema, type MarketplaceItem, type ModeConfig } from "@roo-code/types"

const CATALOG_URL = "https://cybermanxd.github.io/MaveCode/catalog-v1.json"
const KEY_ID = "mavecode-marketplace-2026-01"
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MCowBQYDK2VwAyEApi3b8BLwImWFo6PKVc5V9S0hsbqZnhp7qHo+to41PH8=
-----END PUBLIC KEY-----`
const REFRESH_INTERVAL_MS = 4 * 60 * 60 * 1000
const MAX_CATALOG_BYTES = 512 * 1024
const MAX_PACKAGE_BYTES = 20 * 1024 * 1024

interface CatalogItem {
	id: string
	name: string
	description: string
	tags?: string[]
	type: "persona"
	version: string
	packageUrl: string
	sha256: string
	packageSize: number
	signingKeyId: string
	minimumMaveCodeVersion: string
}

interface Catalog {
	schemaVersion: 1
	publishedAt: string
	sourceCommit: string
	items: CatalogItem[]
	signingKeyId: string
	signature?: string
}

interface PersonaPackage {
	schemaVersion: 1
	id: string
	version: string
	definition: Record<string, unknown>
	rules: Array<{ path: string; content: string }>
	references: Array<{ path: string; content: string }>
	source: { repository: string }
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

const canonical = (value: unknown) => JSON.stringify(stable(value))
const sha256 = (value: Buffer) => createHash("sha256").update(value).digest("hex")
const withoutSigning = <T extends { signingKeyId: string; signature?: string }>(value: T) => {
	const { signature: _signature, ...payload } = value
	return payload
}

const verifyDocument = <T extends { signingKeyId: string; signature?: string }>(document: T): void => {
	if (document.signingKeyId !== KEY_ID || typeof document.signature !== "string") {
		throw new Error("Marketplace document has an untrusted signing key")
	}
	const valid = verify(
		null,
		Buffer.from(canonical(withoutSigning(document))),
		createPublicKey(PUBLIC_KEY),
		Buffer.from(document.signature, "base64"),
	)
	if (!valid) throw new Error("Marketplace document signature is invalid")
}

const fetchBounded = async (url: string, maximumBytes: number): Promise<Buffer> => {
	const parsed = new URL(url)
	if (parsed.protocol !== "https:" || parsed.hostname !== "cybermanxd.github.io") {
		throw new Error("Marketplace URL is not trusted")
	}
	const response = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { Accept: "application/json" } })
	if (!response.ok) throw new Error(`Marketplace request failed with HTTP ${response.status}`)
	const declaredLength = Number(response.headers.get("content-length") || 0)
	if (declaredLength > maximumBytes) throw new Error("Marketplace response is too large")
	const bytes = Buffer.from(await response.arrayBuffer())
	if (bytes.length > maximumBytes) throw new Error("Marketplace response is too large")
	return bytes
}

export class RemotePersonaManager {
	private readonly root: string
	private readonly catalogPath: string
	private readonly packagesPath: string
	private refreshPromise?: Promise<boolean>

	constructor(globalStoragePath: string) {
		this.root = path.join(globalStoragePath, "managed-personas")
		this.catalogPath = path.join(this.root, "catalog-v1.json")
		this.packagesPath = path.join(this.root, "packages")
	}

	async getPersonas(options: { force?: boolean } = {}): Promise<ModeConfig[]> {
		await this.refresh(options).catch((error) =>
			console.warn("[RemotePersonaManager] Using cached or bundled personas:", error),
		)
		try {
			const catalog = await this.readVerifiedCatalog()
			return (
				await Promise.all(catalog.items.map((item) => this.readPersona(item).catch(() => undefined)))
			).filter((persona): persona is ModeConfig => Boolean(persona))
		} catch {
			return []
		}
	}

	async getMarketplaceItems(options: { force?: boolean } = {}): Promise<MarketplaceItem[]> {
		await this.refresh(options).catch(() => undefined)
		try {
			return (await this.readVerifiedCatalog()).items as MarketplaceItem[]
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

		const catalogBytes = await fetchBounded(CATALOG_URL, MAX_CATALOG_BYTES)
		const catalog = JSON.parse(catalogBytes.toString("utf8")) as Catalog
		this.validateCatalog(catalog)
		verifyDocument(catalog)
		await fs.mkdir(this.packagesPath, { recursive: true })

		for (const item of catalog.items) {
			const bytes = await fetchBounded(item.packageUrl, Math.min(item.packageSize + 1, MAX_PACKAGE_BYTES))
			if (bytes.length !== item.packageSize || sha256(bytes) !== item.sha256) {
				throw new Error(`Marketplace package digest mismatch for ${item.id}`)
			}
			const personaPackage = JSON.parse(bytes.toString("utf8")) as PersonaPackage
			this.validatePackage(personaPackage, item)
			verifyDocument(personaPackage)
			await this.atomicWrite(this.packagePath(item), bytes)
		}
		await this.atomicWrite(this.catalogPath, catalogBytes)
		return !previous || !previous.equals(catalogBytes)
	}

	private async readVerifiedCatalog(): Promise<Catalog> {
		const catalog = JSON.parse(await fs.readFile(this.catalogPath, "utf8")) as Catalog
		this.validateCatalog(catalog)
		verifyDocument(catalog)
		return catalog
	}

	private async readPersona(item: CatalogItem): Promise<ModeConfig> {
		const bytes = await fs.readFile(this.packagePath(item))
		if (bytes.length !== item.packageSize || sha256(bytes) !== item.sha256)
			throw new Error("Cached package digest mismatch")
		const personaPackage = JSON.parse(bytes.toString("utf8")) as PersonaPackage
		this.validatePackage(personaPackage, item)
		verifyDocument(personaPackage)
		const sections = [
			...personaPackage.rules.map((file) => `## Managed persona rule: ${file.path}\n${file.content}`),
			...personaPackage.references.map((file) => `## Managed persona reference: ${file.path}\n${file.content}`),
		]
		return modeConfigSchema.parse({
			...personaPackage.definition,
			customInstructions: [personaPackage.definition.customInstructions, ...sections]
				.filter(Boolean)
				.join("\n\n"),
			personaVersion: personaPackage.version,
			immutablePersona: true,
			bundledPersona: true,
			source: "global",
		})
	}

	private validateCatalog(catalog: Catalog): void {
		if (catalog.schemaVersion !== 1 || !Array.isArray(catalog.items) || catalog.items.length > 100) {
			throw new Error("Unsupported marketplace catalog")
		}
		const ids = new Set<string>()
		for (const item of catalog.items) {
			if (item.type !== "persona" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id) || ids.has(item.id)) {
				throw new Error("Invalid marketplace persona entry")
			}
			ids.add(item.id)
			if (!/^[a-f0-9]{64}$/.test(item.sha256) || item.packageSize <= 0 || item.packageSize > MAX_PACKAGE_BYTES) {
				throw new Error(`Invalid marketplace package metadata for ${item.id}`)
			}
		}
	}

	private validatePackage(personaPackage: PersonaPackage, item: CatalogItem): void {
		if (
			personaPackage.schemaVersion !== 1 ||
			personaPackage.id !== item.id ||
			personaPackage.version !== item.version ||
			personaPackage.definition?.slug !== item.id ||
			!Array.isArray(personaPackage.rules) ||
			!Array.isArray(personaPackage.references)
		) {
			throw new Error(`Invalid marketplace package for ${item.id}`)
		}
	}

	private packagePath(item: CatalogItem): string {
		return path.join(this.packagesPath, `${item.id}-${item.version}-${item.sha256}.mavepersona`)
	}

	private async atomicWrite(destination: string, bytes: Buffer): Promise<void> {
		await fs.mkdir(path.dirname(destination), { recursive: true })
		const temporary = `${destination}.${process.pid}.${Date.now()}.tmp`
		await fs.writeFile(temporary, bytes, { flag: "wx" })
		await fs.rename(temporary, destination).catch(async () => {
			await fs.rm(destination, { force: true })
			await fs.rename(temporary, destination)
		})
	}
}

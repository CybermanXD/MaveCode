import * as fs from "fs/promises"
import * as path from "path"
import * as yaml from "yaml"

import { modeConfigSchema, type ModeConfig } from "@roo-code/types"

import { RemotePersonaManager } from "./RemotePersonaManager"

interface PersonaManifestEntry {
	id: string
	version: string
	definition: string
	rules?: string[]
	references?: string[]
}

interface PersonaManifest {
	personas: PersonaManifestEntry[]
}

const readText = (root: string, relativePath: string) => fs.readFile(path.join(root, relativePath), "utf-8")

/** Loads the immutable personas shipped in the current VSIX. */
export class BundledPersonaManager {
	private cachedBundled?: ModeConfig[]

	private readonly remotePersonaManager?: RemotePersonaManager

	constructor(
		private readonly extensionPath: string,
		globalStoragePath?: string,
	) {
		this.remotePersonaManager = globalStoragePath ? new RemotePersonaManager(globalStoragePath) : undefined
	}

	public async getPersonas(): Promise<ModeConfig[]> {
		const packagedRoot = path.join(this.extensionPath, "dist", "assets", "personas")
		const sourceRoot = path.join(this.extensionPath, "assets", "personas")
		const root = await fs
			.access(packagedRoot)
			.then(() => packagedRoot)
			.catch(() => sourceRoot)
		try {
			const manifest = yaml.parse(await readText(root, "manifest.yaml")) as PersonaManifest
			const personas =
				this.cachedBundled ??
				(await Promise.all(
					(manifest.personas ?? []).map(async (entry) => {
						const personaRoot = path.join(root, entry.id)
						const rawDefinition = yaml.parse(
							await fs.readFile(path.join(personaRoot, entry.definition), "utf-8"),
						)
						const sections: string[] = []

						for (const file of entry.rules ?? []) {
							sections.push(`## Bundled persona rule: ${file}\n${await readText(personaRoot, file)}`)
						}
						for (const file of entry.references ?? []) {
							sections.push(`## Bundled persona reference: ${file}\n${await readText(personaRoot, file)}`)
						}

						return modeConfigSchema.parse({
							...rawDefinition,
							customInstructions: [rawDefinition.customInstructions, ...sections]
								.filter(Boolean)
								.join("\n\n"),
							personaVersion: entry.version,
							immutablePersona: true,
							bundledPersona: true,
							source: "global",
						})
					}),
				))
			this.cachedBundled = personas

			const remotePersonas = (await this.remotePersonaManager?.getPersonas()) ?? []
			const remoteBySlug = new Map(remotePersonas.map((persona) => [persona.slug, persona]))
			const bundledSlugs = new Set(personas.map((persona) => persona.slug))
			return [
				...personas.map((persona) => remoteBySlug.get(persona.slug) ?? persona),
				...remotePersonas.filter((persona) => !bundledSlugs.has(persona.slug)),
			]
		} catch (error) {
			console.error("[BundledPersonaManager] Failed to load bundled personas:", error)
			return []
		}
	}
}

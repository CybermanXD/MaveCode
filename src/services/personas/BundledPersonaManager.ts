import * as fs from "fs/promises"
import * as path from "path"
import * as yaml from "yaml"

import { modeConfigSchema, type ModeConfig } from "@roo-code/types"

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
	private cached?: ModeConfig[]

	constructor(private readonly extensionPath: string) {}

	public async getPersonas(): Promise<ModeConfig[]> {
		if (this.cached) return this.cached

		const packagedRoot = path.join(this.extensionPath, "dist", "assets", "personas")
		const sourceRoot = path.join(this.extensionPath, "assets", "personas")
		const root = await fs
			.access(packagedRoot)
			.then(() => packagedRoot)
			.catch(() => sourceRoot)
		try {
			const manifest = yaml.parse(await readText(root, "manifest.yaml")) as PersonaManifest
			const personas = await Promise.all(
				(manifest.personas ?? []).map(async (entry) => {
					const personaRoot = path.join(root, entry.id)
					const rawDefinition = yaml.parse(await fs.readFile(path.join(personaRoot, entry.definition), "utf-8"))
					const sections: string[] = []

					for (const file of entry.rules ?? []) {
						sections.push(`## Bundled persona rule: ${file}\n${await readText(personaRoot, file)}`)
					}
					for (const file of entry.references ?? []) {
						sections.push(`## Bundled persona reference: ${file}\n${await readText(personaRoot, file)}`)
					}

					return modeConfigSchema.parse({
						...rawDefinition,
						customInstructions: [rawDefinition.customInstructions, ...sections].filter(Boolean).join("\n\n"),
						personaVersion: entry.version,
						immutablePersona: true,
						bundledPersona: true,
						source: "global",
					})
				}),
			)

			this.cached = personas
			return personas
		} catch (error) {
			console.error("[BundledPersonaManager] Failed to load bundled personas:", error)
			return []
		}
	}
}

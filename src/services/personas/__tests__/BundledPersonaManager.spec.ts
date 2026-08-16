import * as path from "path"
import { describe, expect, it } from "vitest"

import { BundledPersonaManager } from "../BundledPersonaManager"

describe("BundledPersonaManager", () => {
	it("loads all bundled personas with isolated rules and immutable metadata", async () => {
		const extensionPath = path.resolve(__dirname, "../../../..")
		const personas = await new BundledPersonaManager(extensionPath).getPersonas()

		expect(personas.map(({ slug }) => slug)).toEqual(["enphase", "standard"])
		for (const persona of personas) {
			expect(persona).toMatchObject({
				immutablePersona: true,
				bundledPersona: true,
				source: "global",
			})
			expect(persona.customInstructions).toContain(`Bundled persona rule`)
			expect(persona.customInstructions).toContain(`Bundled persona reference`)
		}
		expect(personas.find(({ slug }) => slug === "enphase")?.personaVersion).toBe("1.3.0")
		expect(personas.find(({ slug }) => slug === "standard")?.personaVersion).toBe("1.1.0")

		const enphase = personas.find(({ slug }) => slug === "enphase")!
		expect(enphase.customInstructions).toContain("Enphase core rules")
		expect(enphase.customInstructions).not.toContain("Standard core rules")
	})

	it("filters disabled optional personas but never filters Standard", async () => {
		const extensionPath = path.resolve(__dirname, "../../../..")
		const globalState = {
			get: () => ["enphase", "standard"],
			update: async () => undefined,
		} as any
		const manager = new BundledPersonaManager(extensionPath, undefined, globalState)

		expect((await manager.getPersonas()).map(({ slug }) => slug)).toEqual(["standard"])
		expect((await manager.getPersonas(true)).map(({ slug }) => slug)).toEqual(["enphase", "standard"])
		expect(await manager.getManagedPersonaSlugs()).toEqual(new Set(["enphase", "standard"]))
	})
})

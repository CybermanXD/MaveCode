import { generateKeyPairSync, sign } from "node:crypto"
import * as fs from "fs/promises"
import * as os from "os"
import * as path from "path"

import { afterEach, describe, expect, it, vi } from "vitest"

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

describe("RemotePersonaManager", () => {
	const temporaryDirectories: string[] = []

	afterEach(async () => {
		vi.unstubAllGlobals()
		await Promise.all(
			temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
		)
	})

	it("falls back cleanly when the remote catalog cannot be fetched", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
		const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mave-marketplace-"))
		temporaryDirectories.push(directory)
		const { RemotePersonaManager } = await import("../RemotePersonaManager")
		expect(await new RemotePersonaManager(directory).getPersonas()).toEqual([])
	})

	it("rejects an unsigned catalog", async () => {
		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValue(
					new Response(
						JSON.stringify({
							schemaVersion: 1,
							publishedAt: new Date().toISOString(),
							sourceCommit: "x",
							items: [],
						}),
					),
				),
		)
		const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mave-marketplace-"))
		temporaryDirectories.push(directory)
		const { RemotePersonaManager } = await import("../RemotePersonaManager")
		expect(await new RemotePersonaManager(directory).getMarketplaceItems()).toEqual([])
	})

	it("uses deterministic canonical JSON for Ed25519 signatures", () => {
		const { privateKey, publicKey } = generateKeyPairSync("ed25519")
		const payload = { schemaVersion: 1, items: [{ id: "standard", version: "1.1.0" }] }
		const signature = sign(null, Buffer.from(JSON.stringify(stable(payload))), privateKey)
		expect(
			require("node:crypto").verify(null, Buffer.from(JSON.stringify(stable(payload))), publicKey, signature),
		).toBe(true)
	})
})

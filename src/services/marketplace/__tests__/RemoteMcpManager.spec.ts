import * as fs from "node:fs/promises"
import * as os from "node:os"
import * as path from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { RemoteMcpManager } from "../RemoteMcpManager"

describe("RemoteMcpManager", () => {
	const temporaryDirectories: string[] = []

	afterEach(async () => {
		vi.unstubAllGlobals()
		await Promise.all(
			temporaryDirectories.splice(0).map((directory) => fs.rm(directory, { recursive: true, force: true })),
		)
	})

	async function createManager() {
		const directory = await fs.mkdtemp(path.join(os.tmpdir(), "mave-mcp-marketplace-"))
		temporaryDirectories.push(directory)
		return new RemoteMcpManager(directory, "3.76.12")
	}

	it("falls back cleanly while offline", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")))
		expect(await (await createManager()).getMarketplaceItems()).toEqual([])
	})

	it("rejects unsigned catalogs", async () => {
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue(
				new Response(
					JSON.stringify({
						schemaVersion: 1,
						publishedAt: new Date().toISOString(),
						sourceCommit: "test",
						minimumMaveCodeVersion: "3.76.12",
						items: [],
					}),
				),
			),
		)
		expect(await (await createManager()).getMarketplaceItems({ force: true })).toEqual([])
	})

	it("deduplicates concurrent forced refreshes", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("offline"))
		vi.stubGlobal("fetch", fetchMock)
		const manager = await createManager()
		const first = manager.refresh({ force: true })
		const second = manager.refresh({ force: true })
		await expect(first).rejects.toThrow("offline")
		await expect(second).rejects.toThrow("offline")
		expect(fetchMock).toHaveBeenCalledTimes(1)
	})
})

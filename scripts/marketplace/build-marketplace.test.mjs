import assert from "node:assert/strict"
import { execFile } from "node:child_process"
import { readFile, rm } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { fileURLToPath } from "node:url"

const execute = promisify(execFile)
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")

await execute(process.execPath, ["scripts/marketplace/build-marketplace.mjs", "--unsigned", "--skip-version-check"], {
	cwd: root,
})
const catalog = JSON.parse(await readFile(path.join(root, "marketplace/published/catalog-v1.json"), "utf8"))
assert.deepEqual(
	catalog.items.map(({ id }) => id),
	["enphase", "standard"],
)
for (const item of catalog.items) {
	assert.match(item.sha256, /^[a-f0-9]{64}$/)
	assert.equal(item.type, "persona")
	assert.ok(item.packageSize > 0)
	const personaPackage = JSON.parse(
		await readFile(path.join(root, "marketplace/published/packages", `${item.id}-${item.version}.mavepersona`), "utf8"),
	)
	assert.equal(personaPackage.id, item.id)
	assert.equal(personaPackage.definition.slug, item.id)
	assert.ok(personaPackage.rules.length > 0)
}
await rm(path.join(root, "marketplace/published"), { recursive: true, force: true })
console.log("Marketplace builder tests passed.")

import { createHash, createPrivateKey, createPublicKey, sign } from "node:crypto"
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises"
import path from "node:path"
import process from "node:process"
import { fileURLToPath } from "node:url"
import YAML from "yaml"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const personaRoot = path.join(root, "src/assets/personas")
const sourceRoot = path.join(root, "marketplace/sources/personas")
const outputRoot = path.join(root, "marketplace/published")
const packageRoot = path.join(outputRoot, "packages")
const immutableDigestPath = path.join(root, "marketplace/version-digests.json")
const catalogBaseUrl = (process.env.MARKETPLACE_BASE_URL || "https://cybermanxd.github.io/MaveCode").replace(/\/$/, "")
const keyId = process.env.MARKETPLACE_SIGNING_KEY_ID || "mavecode-marketplace-2026-01"
const privateKeyPem = process.env.MARKETPLACE_ED25519_PRIVATE_KEY?.replace(/\\n/g, "\n")
const allowUnsigned = process.argv.includes("--unsigned")
const skipVersionCheck = process.argv.includes("--skip-version-check")

const assert = (condition, message) => {
	if (!condition) throw new Error(message)
}

const assertRelativePath = (value, label) => {
	assert(typeof value === "string" && value.length > 0, `${label} must be a non-empty path`)
	assert(!path.isAbsolute(value), `${label} must be relative`)
	assert(!value.split(/[\\/]/).includes(".."), `${label} cannot traverse directories`)
}

const stable = (value) => {
	if (Array.isArray(value)) return value.map(stable)
	if (value && typeof value === "object") {
		return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]))
	}
	return value
}

const canonical = (value) => JSON.stringify(stable(value))
const digest = (value) => createHash("sha256").update(value).digest("hex")
const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/
const slug = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const readPersonaFiles = async (personaDirectory, files, kind) => {
	const results = []
	for (const relativePath of files || []) {
		assertRelativePath(relativePath, `${kind} path`)
		const absolutePath = path.resolve(personaDirectory, relativePath)
		assert(absolutePath.startsWith(`${personaDirectory}${path.sep}`), `${kind} path escapes persona directory`)
		const content = await readFile(absolutePath, "utf8")
		assert(Buffer.byteLength(content) <= 5 * 1024 * 1024, `${kind} file ${relativePath} is too large`)
		results.push({ path: relativePath.replaceAll("\\", "/"), content })
	}
	return results
}

const signValue = (value) => {
	if (!privateKeyPem) {
		assert(allowUnsigned, "MARKETPLACE_ED25519_PRIVATE_KEY is required unless --unsigned is used")
		return undefined
	}
	const key = createPrivateKey(privateKeyPem)
	assert(key.asymmetricKeyType === "ed25519", "Marketplace private key must be Ed25519")
	return sign(null, Buffer.from(canonical(value)), key).toString("base64")
}

const manifest = YAML.parse(await readFile(path.join(personaRoot, "manifest.yaml"), "utf8"))
assert(Array.isArray(manifest?.personas) && manifest.personas.length > 0, "Persona manifest is empty")

await rm(outputRoot, { recursive: true, force: true })
await mkdir(packageRoot, { recursive: true })

const seen = new Set()
const items = []
const immutableDigests = JSON.parse(await readFile(immutableDigestPath, "utf8").catch(() => "{}"))
const nextImmutableDigests = { ...immutableDigests }
for (const entry of manifest.personas) {
	assert(slug.test(entry.id), `Invalid persona ID: ${entry.id}`)
	assert(!seen.has(entry.id), `Duplicate persona ID: ${entry.id}`)
	seen.add(entry.id)
	assert(semver.test(entry.version), `Invalid version for ${entry.id}: ${entry.version}`)
	assertRelativePath(entry.definition, "definition path")

	const metadata = JSON.parse(await readFile(path.join(sourceRoot, entry.id, "marketplace.json"), "utf8"))
	assert(metadata.id === entry.id, `Marketplace ID mismatch for ${entry.id}`)
	assert(typeof metadata.name === "string" && metadata.name.length > 0, `Missing name for ${entry.id}`)
	assert(semver.test(metadata.minimumMaveCodeVersion), `Invalid minimum MaveCode version for ${entry.id}`)

	const directory = path.join(personaRoot, entry.id)
	const definition = YAML.parse(await readFile(path.join(directory, entry.definition), "utf8"))
	assert(definition?.slug === entry.id, `Definition slug mismatch for ${entry.id}`)
	assert(Array.isArray(definition.groups) && definition.groups.length > 0, `Definition groups missing for ${entry.id}`)

	const payload = {
		schemaVersion: 1,
		id: entry.id,
		version: entry.version,
		definition,
		rules: await readPersonaFiles(directory, entry.rules, "rule"),
		references: await readPersonaFiles(directory, entry.references, "reference"),
		source: {
			repository: process.env.GITHUB_REPOSITORY || "CybermanXD/MaveCode",
		},
	}
	const packageSignedPayload = { ...payload, signingKeyId: keyId }
	const packageDocument = { ...packageSignedPayload, signature: signValue(packageSignedPayload) }
	const packageBytes = `${canonical(packageDocument)}\n`
	const packageName = `${entry.id}-${entry.version}.mavepersona`
	const sourceDigest = digest(canonical(payload))
	const versionKey = `${entry.id}@${entry.version}`
	assert(
		skipVersionCheck || !immutableDigests[versionKey] || immutableDigests[versionKey] === sourceDigest,
		`Persona ${versionKey} changed without a version bump`,
	)
	nextImmutableDigests[versionKey] = sourceDigest
	await writeFile(path.join(packageRoot, packageName), packageBytes, "utf8")

	items.push({
		...metadata,
		type: "persona",
		version: entry.version,
		packageUrl: `${catalogBaseUrl}/packages/${packageName}`,
		sha256: digest(packageBytes),
		packageSize: Buffer.byteLength(packageBytes),
		signingKeyId: keyId,
	})
}

const catalogPayload = {
	schemaVersion: 1,
	publishedAt: process.env.SOURCE_DATE_EPOCH
		? new Date(Number(process.env.SOURCE_DATE_EPOCH) * 1000).toISOString()
		: new Date().toISOString(),
	sourceCommit: process.env.GITHUB_SHA || "local",
	items: items.sort((left, right) => left.id.localeCompare(right.id)),
}
const catalogSignedPayload = { ...catalogPayload, signingKeyId: keyId }
const catalog = { ...catalogSignedPayload, signature: signValue(catalogSignedPayload) }
await writeFile(path.join(outputRoot, "catalog-v1.json"), `${canonical(catalog)}\n`, "utf8")
await writeFile(path.join(outputRoot, ".nojekyll"), "", "utf8")
if (process.argv.includes("--update-version-digests")) {
	await writeFile(immutableDigestPath, `${JSON.stringify(nextImmutableDigests, null, 2)}\n`, "utf8")
}

const generated = await readdir(packageRoot)
console.log(`Built marketplace catalog with ${items.length} personas and ${generated.length} packages.`)
if (privateKeyPem && process.env.MARKETPLACE_PUBLIC_KEY_OUTPUT) {
	await writeFile(process.env.MARKETPLACE_PUBLIC_KEY_OUTPUT, createPublicKey(privateKeyPem).export({ type: "spki", format: "pem" }))
}

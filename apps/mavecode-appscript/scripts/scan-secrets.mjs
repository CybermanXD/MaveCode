import { readdir, readFile } from "node:fs/promises"

const roots = ["src", "test", "README.md", ".clasp.json.example", "appsscript.json"]
const forbidden = [
	/https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]{20,}/,
	/\b(?:sk|sess)-[A-Za-z0-9_-]{20,}\b/,
	/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
	/"scriptId"\s*:\s*"(?!REPLACE_)[A-Za-z0-9_-]{20,}"/
]
async function files(path) {
	const stat = await import("node:fs/promises").then((fs) => fs.stat(path))
	if (stat.isFile()) return [path]
	return (await readdir(path, { withFileTypes: true })).flatMap((entry) => entry.isFile() ? [`${path}/${entry.name}`] : [])
}
for (const root of roots) for (const file of await files(root)) {
	const source = await readFile(file, "utf8")
	for (const pattern of forbidden) if (pattern.test(source)) throw new Error(`Possible secret in ${file}`)
}
console.log("Static secret scan passed")

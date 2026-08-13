import { readFile } from "node:fs/promises"

for (const file of ["src/core.js", "src/main.js"]) {
	const source = await readFile(file, "utf8")
	if (/\t +| +\t|[ \t]+$/m.test(source)) throw new Error(`${file}: mixed or trailing whitespace`)
	if (/\b(eval|Function)\s*\(/.test(source)) throw new Error(`${file}: dynamic code execution is forbidden`)
}

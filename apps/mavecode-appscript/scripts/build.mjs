import { cp, mkdir, rm } from "node:fs/promises"

await rm("dist", { recursive: true, force: true })
await mkdir("dist", { recursive: true })
await cp("src/core.js", "dist/core.js")
await cp("src/main.js", "dist/main.js")
await cp("appsscript.json", "dist/appsscript.json")

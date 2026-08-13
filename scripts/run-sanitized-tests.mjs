import { cp, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import { fileURLToPath } from "node:url"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const requestedScripts = process.argv.slice(2)
const scripts = requestedScripts.length > 0 ? requestedScripts : ["test"]
const excludedNames = new Set([
	".git",
	".turbo",
	"node_modules",
	"bin",
	"build",
	"coverage",
	"dist",
	"out",
	"playwright-report",
	"test-results",
])

function run(command, args, cwd, env = process.env) {
	return new Promise((resolve, reject) => {
		const executable = process.platform === "win32" ? process.execPath : command
		const executableArgs = process.platform === "win32" ? [corepackScript, ...args] : args
		const child = spawn(executable, executableArgs, { cwd, env, shell: false, stdio: "inherit" })
		child.on("error", reject)
		child.on("exit", (code, signal) => {
			if (code === 0) resolve()
			else reject(new Error(`${command} exited with ${code ?? signal}`))
		})
	})
}

const corepackCommand =
	process.platform === "win32" ? path.join(path.dirname(process.execPath), "corepack.cmd") : "corepack"
const corepackScript =
	process.platform === "win32"
		? path.join(path.dirname(process.execPath), "node_modules", "corepack", "dist", "corepack.js")
		: undefined

const temporaryRoot = await mkdtemp(path.join(tmpdir(), "mavecode-qa-"))
const sanitizedRepository = path.join(temporaryRoot, "workspace")
const shimDirectory = path.join(temporaryRoot, "corepack-bin")

try {
	console.log(`Copying release-test workspace to sanitized path: ${sanitizedRepository}`)
	await cp(repositoryRoot, sanitizedRepository, {
		recursive: true,
		filter: (source) =>
			path.resolve(source) === path.join(repositoryRoot, "packages", "build") ||
			!excludedNames.has(path.basename(source)),
	})

	await mkdir(shimDirectory)
	if (process.platform === "win32") {
		await writeFile(path.join(shimDirectory, "pnpm.cmd"), `@echo off\r\n"${corepackCommand}" pnpm %*\r\n`)
	} else {
		await writeFile(path.join(shimDirectory, "pnpm"), '#!/bin/sh\nexec corepack pnpm "$@"\n', { mode: 0o755 })
	}
	const env = { ...process.env, PATH: `${shimDirectory}${path.delimiter}${process.env.PATH ?? ""}` }

	await run(corepackCommand, ["pnpm", "install", "--frozen-lockfile"], sanitizedRepository, env)
	for (const script of scripts) await run(corepackCommand, ["pnpm", script], sanitizedRepository, env)
	if (scripts.includes("vsix")) {
		await rm(path.join(repositoryRoot, "bin"), { recursive: true, force: true })
		await cp(path.join(sanitizedRepository, "bin"), path.join(repositoryRoot, "bin"), { recursive: true })
		console.log(`Copied sanitized VSIX artifacts to: ${path.join(repositoryRoot, "bin")}`)
	}
} finally {
	await rm(temporaryRoot, { recursive: true, force: true, maxRetries: 3, retryDelay: 250 })
	console.log(`Removed sanitized release-test workspace: ${temporaryRoot}`)
}

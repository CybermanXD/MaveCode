# MaveCode

MaveCode is a VS Code extension that provides AI-assisted software development with project personas, code editing, terminal execution, debugging, planning, and MCP tools.

## Install

Download the latest `mave-code-<version>.vsix` file from the GitHub Releases page, then use **Extensions: Install from VSIX...** in VS Code.

You can also install it from a terminal:

```sh
code --install-extension mave-code-<version>.vsix
```

## Build from source

Requirements:

- Node.js 22
- pnpm 10
- VS Code

Install dependencies and package the extension:

```sh
pnpm install --frozen-lockfile
cd src
pnpm run vscode:prepublish
pnpm run vsix
```

The package is written to `bin/mave-code-<version>.vsix`.

## Core capabilities

- AI-assisted code analysis, editing, and debugging
- Project-specific bundled personas
- Terminal command execution with approval controls
- Custom modes, rules, and workflows
- MCP server integrations
- Multiple AI provider configurations

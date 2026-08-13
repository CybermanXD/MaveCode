# Contributing

## Development setup

1. Install Node.js 22 and pnpm 10.
2. Run `pnpm install --frozen-lockfile`.
3. Run the relevant type checks and tests for changed packages.
4. Build the extension from `src` with `pnpm run vscode:prepublish`.

Keep pull requests focused, include tests for changed behavior, and do not commit credentials, local configuration, generated packages, or deployment-specific endpoints.

Security vulnerabilities should be reported privately through the repository's GitHub Security Advisory feature.


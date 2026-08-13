# Local QA and release validation

## Local QA commands

From the repository root, run focused package checks:

```powershell
pnpm --filter @mavecode/admin-helper test
pnpm --filter @mavecode/admin-helper lint
pnpm --filter @mavecode/admin-helper check-types
pnpm --filter @mavecode/appscript test
pnpm --filter @mavecode/appscript lint
pnpm --filter @mavecode/appscript check-types
pnpm --filter @mavecode/appscript build
pnpm --filter @mavecode/appscript scan:secrets
pnpm --filter @mavecode/local-e2e test
```

Repository-level checks:

```powershell
pnpm lint
pnpm check-types
pnpm test
pnpm bundle
pnpm vsix
```

## Mock local E2E scope

The mock local E2E package [`../apps/mavecode-local-e2e`](../apps/mavecode-local-e2e) validates the Phase 1 path without real provider credentials:

- Helper configuration validation.
- Helper loopback behavior.
- Signed provider intake relay.
- Apps Script action routing.
- Session issue, verify, refresh, and revoke behavior.
- Model fetch behavior.
- Buffered chat behavior.
- Tool-call continuation behavior.
- Expiry, revocation, quota, and normalized error behavior.
- Secret non-disclosure gates.

This is not a substitute for credentialed deployment smoke testing.

## Sanitized-path test and release runner

The source workspace path contains `#`, which can break Vite and related tooling. The sanitized runner [`../scripts/run-sanitized-tests.mjs`](../scripts/run-sanitized-tests.mjs):

1. Copies the repository to a temporary path without special characters.
2. Excludes generated and dependency directories such as `.git`, `node_modules`, `bin`, `dist`, `out`, and coverage output.
3. Runs `corepack pnpm install --frozen-lockfile` in the sanitized copy.
4. Runs requested scripts, defaulting to `test`.
5. Copies VSIX artifacts from the sanitized workspace back to [`../bin`](../bin) when `vsix` is included.
6. Removes the temporary workspace.

Commands:

```powershell
pnpm test:sanitized
pnpm release:sanitized
```

`pnpm release:sanitized` maps to `node scripts/run-sanitized-tests.mjs bundle vsix`.

## Built VSIX validation

Validate the artifact:

- File exists: [`../bin/mave-code-3.76.0.vsix`](../bin/mave-code-3.76.0.vsix).
- Installs with `code --install-extension bin/mave-code-3.76.0.vsix`.
- Extension ID is `MaveCode.mave-code`.
- Display name is `MaveCode`.
- MaveCode provider label appears in settings.
- No known source secret patterns are present in docs or release notes.

## Documentation validation checklist

Because this phase edits Markdown only, validation focuses on documentation correctness:

- All relative links point to existing tracked files or directories.
- All deployment examples use placeholders.
- No real Apps Script deployment ID, OAuth client ID, provider account ID, runtime URL, bearer token, refresh token, ID token, session token, or intake secret appears in docs.
- Root [`../README.md`](../README.md) points to this documentation set and built VSIX.
- [`../FORK_NOTES.md`](../FORK_NOTES.md) preserves upstream attribution and license notes.
- [`../PRODUCT_PLAN.md`](../PRODUCT_PLAN.md) marks Phase 1.12 complete only after documentation validation.
- [`implementation/PHASE_1_VERTICAL_SLICE.md`](implementation/PHASE_1_VERTICAL_SLICE.md) marks the documentation phase complete only after validation.

Manual search patterns that should return placeholders only:

```text
script.google.com/macros/s/
MAVECODE_INTAKE_SECRET
mave_ext_
Bearer
refreshToken
idToken
client_id
```

## Phase 1 release gate summary

Phase 1 is code-complete and local-QA-complete when:

- Focused helper tests pass.
- Focused Apps Script tests, build, and secret scan pass.
- Mock local E2E passes.
- Root lint/type/test gates pass or are covered by sanitized runner when source path characters interfere.
- `pnpm release:sanitized` produces [`../bin/mave-code-3.76.0.vsix`](../bin/mave-code-3.76.0.vsix).
- Documentation validation is complete.

Credentialed deployment readiness additionally requires:

- Private Apps Script deployment.
- Private helper configuration.
- Provider-approved OAuth/client/runtime setup.
- Smoke-test checklist completion from [`security-and-threat-model.md`](security-and-threat-model.md).


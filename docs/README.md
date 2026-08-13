# MaveCode MVP documentation

This directory is the Phase 1.12 documentation set for the fully implemented MaveCode MVP. It documents the code-complete and local-QA-complete vertical slice without publishing credentials, deployment IDs, OAuth client IDs, provider account identifiers, or runtime secrets.

## MVP status

- Code implementation: **complete for Phase 1 MVP**.
- Local/mock QA and sanitized release packaging: **complete for Phase 1 MVP**.
- Built VSIX artifact: [`../bin/mave-code-3.76.0.vsix`](../bin/mave-code-3.76.0.vsix).
- Credentialed deployment smoke testing: **requires private Apps Script deployment, private helper configuration, private Codex/OAuth configuration, and provider approval review**.
- Provider/compliance approval: **required before multi-user production use**.

## Documentation map

1. [`architecture.md`](architecture.md) — MVP architecture, trust boundaries, data flow, HMAC intake boundary, and implementation completion summary.
2. [`deployment.md`](deployment.md) — prerequisites, helper setup, Codex OAuth placeholders, Apps Script creation, Script Properties, clasp/manual deployment, web-app settings, extension install, first deployment, smoke test, rollback, and upgrade steps.
3. [`operations.md`](operations.md) — administrator and user operation, revocation, rotation, recovery, quotas, session behavior, and troubleshooting matrix.
4. [`security-and-threat-model.md`](security-and-threat-model.md) — security review checklist, threat model, secrets handling, provider terms caveats, and smoke-test constraints.
5. [`qa-and-release.md`](qa-and-release.md) — local QA commands, mock E2E coverage, sanitized-path test/release runner, VSIX validation, and documentation validation checklist.
6. [`production-migration.md`](production-migration.md) — Apps Script buffering/cancellation/concurrency limitations and staged migration to a streaming Node/Fastify or Cloud Run gateway.

## Implementation references

- Admin helper package: [`../apps/mavecode-admin-helper`](../apps/mavecode-admin-helper)
- Apps Script backend package: [`../apps/mavecode-appscript`](../apps/mavecode-appscript)
- Mock local E2E package: [`../apps/mavecode-local-e2e`](../apps/mavecode-local-e2e)
- Extension provider adapter: [`../src/api/providers/mave-gateway.ts`](../src/api/providers/mave-gateway.ts)
- Extension Apps Script client: [`../src/services/mavecode-appscript-client.ts`](../src/services/mavecode-appscript-client.ts)
- Extension session service: [`../src/services/mave-code-auth.ts`](../src/services/mave-code-auth.ts)
- Sanitized release runner: [`../scripts/run-sanitized-tests.mjs`](../scripts/run-sanitized-tests.mjs)
- Product plan: [`../PRODUCT_PLAN.md`](../PRODUCT_PLAN.md)
- Vertical-slice plan: [`implementation/PHASE_1_VERTICAL_SLICE.md`](implementation/PHASE_1_VERTICAL_SLICE.md)

## Secret-handling rule

All examples in this documentation use placeholders only. Do not replace placeholders in tracked Markdown. Real values belong only in private environment files, Apps Script Script Properties, Google deployment settings, VS Code Secret Storage, or an approved production secret store.


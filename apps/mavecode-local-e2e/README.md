# MaveCode Phase 1.10 local E2E QA

This package is a **simulated local E2E gate**. It runs the real admin-helper HTTP routes, the real Apps Script backend core/router, and the real extension Apps Script protocol client in one Node process. OAuth, OpenAI/Codex, Apps Script services, identity, properties, cache, locks, and network transport are deterministic fakes. It never contacts OpenAI or a deployed Apps Script URL.

Run from the repository root:

```powershell
pnpm --filter @mavecode/local-e2e test
```

The gate covers helper configuration and OAuth state/PKCE callback, signed intake and replay rejection, provider readiness/revocation/expiry, extension session issue/verify/refresh/revoke/expiry, model discovery, persisted provider-selection shape, multi-turn text and tool-result history, an approved local tool loop, usage, malformed signatures, backend quota, normalized provider errors, and capture-based secret non-disclosure checks.

## Not a deployment smoke test

Passing this package proves local cross-layer protocol compatibility only. Before production release, separately smoke-test the deployed Apps Script web app and real OAuth/provider account: deployment permissions and execute-as identity, Google redirect behavior, Script Properties, CacheService/LockService, UrlFetchApp connectivity, OAuth consent/callback, real model availability, and production logging/monitoring. Those deployment checks require credentials and infrastructure and are intentionally not automated here.

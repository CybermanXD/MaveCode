# MaveCode Apps Script MVP backend

This standalone package implements the Apps Script backend for the Phase 1 MaveCode vertical slice: protected Codex authorization intake, provider lifecycle, short-lived extension sessions, a versioned model catalog, and buffered text/tool chat protocol. The provider UI, extension adapter, mock E2E, sanitized release runner, and VSIX packaging are implemented elsewhere in the repository. The full Phase 1 deployment and operations guide is in [`../../docs/deployment.md`](../../docs/deployment.md).

## Security model and limitations

- Helper intake uses HMAC-SHA-256 over `timestamp + "." + nonce + "." + sha256(rawBody)`, exactly matching the admin helper. The URL-safe base64 signature has no padding. A timestamp window, cryptographically random nonce, lock-protected replay cache, and request limit are enforced.
- Apps Script web-app events do not reliably expose arbitrary HTTP headers. The helper therefore sends `timestamp`, `nonce`, and `signature` as query parameters while retaining the signed raw JSON body. Never place provider credentials in query parameters.
- Google Identity Services supplies an ID token to the static page. Apps Script verifies its audience, issuer, expiry, and verified email before applying email and domain allowlists.
- Extension sessions are opaque, hashed before storage, short-lived, refresh-limited, revocable, and contain only subject/role/time claims. A single-use PKCE-bound authorization code prevents bearer sessions from appearing in browser callback URLs.
- Provider credentials are never returned by any action. Apps Script Script Properties are access-controlled but are **not managed-key encryption**. This is an MVP tradeoff; production must use a managed secret store and KMS encryption.
- Session-authorized requests use the verified identity recorded during Google sign-in and do not depend on Apps Script active-user propagation.
- Cache replay prevention is bounded by Apps Script cache semantics. Timestamp validation remains the fail-safe after cache expiry. Locks serialize replay, quota, credential, and session mutations.
- Apps Script calls the fixed ChatGPT Codex Responses endpoint directly with redirects disabled. Responses, errors, and logs must never include provider credentials or full source/prompts.

## Configuration

Set these values in **Project Settings → Script Properties**. Examples are intentionally non-deployable and contain no real identifiers or secrets.

| Property | Required | Example / meaning |
| --- | --- | --- |
| `MAVECODE_INTAKE_SECRET` | yes | Generate at deployment; same high-entropy value as the helper |
| `MAVECODE_ALLOWED_USERS` | yes | `developer@example.invalid` comma-separated lowercase emails |
| `MAVECODE_ALLOWED_DOMAINS` | no | `example.invalid,subsidiary.example.invalid`; exact normalized domains only |
| `MAVECODE_ADMIN_USERS` | yes | `administrator@example.invalid` comma-separated; admins can revoke provider auth |
| `MAVECODE_GOOGLE_CLIENT_ID` | yes | Google Web OAuth client ID used by the static page |
| `MAVECODE_EXTENSION_CALLBACK_URI` | yes | `vscode://MaveCode.mave-code/auth-callback` |
| `MAVECODE_AUTH_CODE_TTL_MS` | no | `120000` |
| `MAVECODE_ENABLE_LEGACY_SESSION_ISSUE` | no | Keep unset/false in production; test/migration escape hatch only |
| `MAVECODE_MODEL_ALLOWLIST` | yes | `configured-codex-model` comma-separated exact runtime IDs |
| `MAVECODE_MAX_SKEW_MS` | no | `300000` |
| `MAVECODE_NONCE_TTL_SECONDS` | no | `600` |
| `MAVECODE_SESSION_TTL_MS` | no | `900000` |
| `MAVECODE_REFRESH_TTL_MS` | no | `3600000` |
| `MAVECODE_MAX_REQUEST_BYTES` | no | `10485760` (10 MiB aggregate request limit) |
| `MAVECODE_MAX_MESSAGE_BYTES` | no | `1048576` (1 MiB per message/tool result) |
| `MAVECODE_MAX_RESPONSE_BYTES` | no | `524288` |
| `MAVECODE_QUOTA_PER_MINUTE` | no | `20` per extension subject |
| `MAVECODE_RUNTIME_RECORD_RETENTION_MS` | no | `86400000`; expired authorization codes and sessions are removed after 24 hours |

Generate the intake secret locally with a CSPRNG, enter it directly into Script Properties and the helper's private environment, and never save it in source, shell history, screenshots, or logs. Rotate it after suspected disclosure and redeploy/restart both ends.

Temporary `auth-code.*` and `session.*` Script Properties are runtime records, not configuration. On each backend request, best-effort cleanup removes authorization-code records 24 hours after `expiresAt` and session records 24 hours after `refreshUntil`. Cleanup never removes `provider.codex`, `MAVECODE_*` configuration, malformed records, or sessions that can still be refreshed. Override the 24-hour retention only with `MAVECODE_RUNTIME_RECORD_RETENTION_MS` when operational policy requires it.

## Action protocol

All responses use `{ ok, protocolVersion, data }` or `{ ok, protocolVersion, error: { code, message, retryable } }`. Apps Script's `ContentService` cannot set HTTP status reliably after deployment, so adapters must inspect `ok` and `error.code`; local core tests retain a logical status.

| Action | Method | Authorization | Purpose |
| --- | --- | --- | --- |
| `health` | GET/POST | public | Service, readiness, sanitized provider state |
| `auth-config` | GET/POST | public | Public Google client/callback configuration |
| `auth-google-complete` | POST | verified Google ID token | Apply email/domain allowlist and issue one-time code |
| `auth-code-exchange` | POST | one-time code + PKCE verifier | Issue opaque extension session |
| `provider-token-intake` | POST | helper HMAC | Store expiring Codex authorization |
| `provider-status` | POST | admin identity or session | Sanitized connectivity/expiry |
| `provider-revoke` | POST | admin identity | Delete provider authorization |
| `session-verify` | POST | session | Verify claims, current allowlist, and expiry |
| `session-refresh` | POST | refreshable session | Rotate session token after current allowlist check |
| `session-revoke` | POST | session | Delete session |
| `models` | POST | extension session | Versioned allowlisted capabilities |
| `chat` | POST | extension session | Buffered text/tool request sent directly to Codex Responses |

Example extension request (placeholders only):

```json
{
  "action": "chat",
  "sessionToken": "REPLACE_WITH_SHORT_LIVED_SESSION",
  "model": "configured-codex-model",
  "messages": [
    { "role": "system", "content": "Respond concisely." },
    { "role": "user", "content": "Explain this function." },
    { "role": "assistant", "content": "Please provide it." },
    { "role": "user", "content": "Here is the relevant excerpt." }
  ]
}
```

## Build, test, and deploy

1. From this package run `pnpm test`, `pnpm lint`, `pnpm check-types`, `pnpm build`, and `pnpm scan:secrets`.
2. Copy `.clasp.json.example` to `.clasp.json` (ignored by repository policy), replace only the placeholder script ID, and install/authenticate `clasp` using your organization's approved process.
3. Run `pnpm build`, then `clasp push`. The build copies the tested source and manifest into `dist`; it does not inject configuration.
4. Add Script Properties in the Apps Script console. Never add them to the manifest or clasp file.
5. Deploy as a Web app. Select the narrowest access policy that supports both the authenticated helper intake and verified Workspace active-user identity in your environment. Record the generated deployment URL only in private helper/extension configuration.
6. Verify `health`, confirm a non-allowlisted account cannot issue a session, relay a token from the helper, run one allowlisted session/models/chat flow, revoke the provider, and confirm chat fails with `PROVIDER_EXPIRED`.
7. Review execution logs for accidental prompts or credentials and configure retention/access restrictions. This code emits no request/provider bodies.

The example clasp file, manifest, tests, and README contain no deployment URL, OAuth client ID, account ID, or secret. Never commit the real `.clasp.json` or exported Script Properties.

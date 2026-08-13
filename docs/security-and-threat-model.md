# Security review and threat model

## Security review checklist

Before a credentialed deployment is used beyond a private smoke test, verify:

- No tracked file contains real Apps Script deployment IDs, OAuth client IDs, provider account IDs, access tokens, refresh tokens, ID tokens, helper intake secrets, runtime bearer tokens, or Script Properties exports.
- Helper binds only to `127.0.0.1`.
- Helper `MAVECODE_APPS_SCRIPT_URL` exactly matches the intended Apps Script deployment URL.
- Helper has no route that returns raw tokens.
- Helper emits no wildcard CORS header; `MAVECODE_TRUSTED_ORIGIN` is blank or an exact approved origin.
- OAuth redirect URI exactly matches the provider registration and helper config.
- OAuth state is one-time and expires within the configured TTL.
- PKCE uses S256.
- Apps Script HMAC intake secret is high entropy and shared only with the helper.
- Apps Script rejects stale timestamps, invalid signatures, and replayed nonces.
- Provider credentials are never returned by any Apps Script action.
- Extension stores only MaveCode session material in VS Code Secret Storage.
- Apps Script active-user identity is verified in the chosen deployment access setting.
- User and admin allowlists are lowercase, reviewed, and environment-specific.
- Logs and troubleshooting artifacts redact credentials and do not include full prompts/source by default.
- Provider terms and account-sharing policy are approved for the MVP pattern.

## Threat model

| Threat | Impact | MVP mitigation | Residual risk |
| --- | --- | --- | --- |
| Malicious localhost page calls helper | Provider token theft or relay abuse | Loopback only, no token export, no default CORS, state validation | Browser-origin validation remains limited to exact optional trusted origin. |
| OAuth callback interception or replay | Wrong authorization accepted | Exact state validation, PKCE, short state TTL | Local malware can still observe browser and process memory. |
| Helper config leak | Intake secret and client ID exposure | Private env/config only, no source secrets | Requires manual rotation and incident response. |
| Apps Script URL discovery | Public endpoint probing | HMAC-protected intake, session auth for user actions, allowlist | Web-app access settings must be correct for active identity. |
| HMAC replay | Duplicate provider credential intake | Nonce replay cache with lock and timestamp window | Apps Script cache is bounded; timestamp is the fail-safe. |
| Provider credential returned to extension | Organization-wide provider compromise | No credential-return actions; redaction tests | Script Properties are not a managed vault. |
| Session token stolen from extension host | User impersonation until expiry | Secret Storage, short TTL, refresh limits, identity matching | Compromised local machine can act as user. |
| Prompt/source leakage in logs | Data exposure | Redacted errors and no provider body logging by implementation | Runtime/provider logs outside Apps Script must be separately controlled. |
| Apps Script quota exhaustion | Service degradation | Quotas, payload limits, locks, retryable errors | Apps Script is not a high-concurrency data plane. |
| Unsupported provider authorization pattern | Legal/compliance issue | Explicit provider-terms caveat and approval gate | Must migrate to supported API/project/per-user flow if required. |

## Provider terms caveat

The MVP documents and validates a technical Inboxer-style helper pattern. It does not grant permission to use provider services in a shared, multi-user, or automated gateway setting. Before production or team rollout, obtain approval for:

- OAuth client type and redirect pattern.
- Token relay to Apps Script.
- Shared administrator authorization, if used.
- Runtime endpoint and model access.
- Quotas, rate limits, billing, and audit requirements.
- Any account-sharing or organizational-use restrictions.

If approval is not available, replace the provider authorization model with official API/project credentials, service accounts, or supported per-user OAuth.

## Deployment smoke-test checklist

Run this checklist with real Apps Script, real helper, and the real VSIX, but do not paste real secrets or deployment IDs into repository files or shared logs.

| Step | Expected result |
| --- | --- |
| Install [`../bin/mave-code-3.76.0.vsix`](../bin/mave-code-3.76.0.vsix). | VS Code shows extension ID `MaveCode.mave-code`. |
| Call Apps Script `health`. | Response is `ok: true`, `protocolVersion: mavecode.v1`, no credentials. |
| Start helper and call `/health`. | Helper reports backend configured, no credentials. |
| Complete helper `/auth/start`. | Browser callback succeeds and helper relay status is successful. |
| Call Apps Script `health` again. | Provider shows connected and expiry metadata only. |
| Sign in from extension as allowlisted user. | Extension stores `mave_ext_` session and shows authenticated state. |
| Fetch models. | Only configured allowlisted model IDs appear. |
| Send simple text prompt. | Buffered text response returns through MaveCode provider. |
| Send multi-turn prompt. | Prior messages serialize and response returns. |
| Exercise tool continuation if provider returns a supported tool call. | Tool-call event maps to extension and tool result continuation succeeds. |
| Revoke provider as admin. | New chat fails safely with provider unavailable or expired error. |
| Remove user from allowlist. | New session issue/refresh fails with `FORBIDDEN`. |
| Inspect extension storage and traffic. | No provider credential, helper secret, refresh token, or ID token visible. |
| Inspect Apps Script/helper logs. | No bearer token, provider credential package, full prompt/source, or secret value visible. |

## No-secret examples policy

Allowed in docs:

- `replace-with-your-registered-codex-client-id`
- `https://script.google.com/macros/s/replace-with-deployment-id/exec`
- `replace-with-at-least-32-random-characters`
- `developer@example.invalid`
- `administrator@example.invalid`
- `configured-codex-model`
- `https://runtime.example.invalid/chat`

Not allowed in docs:

- Real Google deployment IDs.
- Real OAuth client IDs.
- Real provider account IDs.
- Real bearer tokens, refresh tokens, ID tokens, or session tokens.
- Real intake secrets.
- Real production runtime URLs.


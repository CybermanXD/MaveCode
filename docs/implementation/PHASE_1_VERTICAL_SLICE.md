# Phase 1 Vertical Slice — MaveCode Provider MVP

## Purpose

Deliver and validate the smallest complete path from an administrator's authorized Codex connection to a text response in the MaveCode VS Code extension. Every implementation step has its own QA gate. A step is not complete until its gate passes and discovered errors are fixed.

## Existing foundation

The fork already contains:

- A registered `mave-gateway` provider identifier and model settings.
- A MaveCode provider settings component.
- An OpenAI-compatible streaming provider adapter.
- VS Code Secret Storage integration for MaveCode sessions.
- URI callback handling and inherited gateway tests.
- Workspace type checks that pass before Phase 1 implementation begins.

## Audit findings to resolve

1. Several active symbols, headers, error strings, options, and translation keys still use inherited Zoo naming.
2. The default model is Claude Sonnet, but the first backend source is Codex.
3. Extension auth expects a legacy `mave_ext_` token prefix.
4. Extension auth expects website-style REST routes that are not yet implemented by Apps Script.
5. The gateway adapter expects OpenAI-compatible `/chat/completions` and model routes, while Apps Script uses action-based requests.
6. The inherited adapter requests streaming, but Apps Script can only provide a buffered MVP response.
7. No MaveCode Admin Helper package exists in the fork.
8. No MaveCode Apps Script backend exists in the fork.
9. No shared versioned protocol schema currently connects helper, backend, and extension.

## First releasable vertical slice

The first slice is intentionally limited to:

- One authorized administrator Codex connection.
- One protected Apps Script deployment.
- Explicitly authorized MaveCode extension users.
- A short-lived MaveCode extension session.
- A MaveCode model catalog containing one configured Codex model.
- Buffered text-only, multi-turn requests.
- No images, MCP forwarding, or model-side tool calls in this slice.
- Local extension tools remain disabled for this slice until the tool protocol is added.

## Step sequence and QA gates

### Step 1 — Protocol package

Define versioned request/response schemas for health, helper intake, extension sessions, models, buffered chat, and normalized errors.

QA gate:

- Schema unit tests pass for valid and invalid payloads.
- Secret fields are excluded from extension-facing response schemas.
- Type checks pass across all consumers.

### Step 2 — MaveCode Admin Helper

Status: **Complete** (Phase 1.2).

Create a new helper package based on the Inboxer proof of concept, but with no embedded URL, client ID, or shared secret.

QA gate:

- Helper starts only on loopback.
- Missing configuration fails with an actionable message.
- OAuth state and PKCE tests pass.
- No HTTP route returns raw provider credentials.
- Static secret scan passes.

### Step 3 — Helper security and token intake signing

Status: **Complete** (Phase 1.3). The receiving Apps Script replay cache remains pending in Step 4.

Add per-install configuration, timestamped HMAC request signing, nonce generation, backend allowlisting, payload-size limits, and sensitive-log redaction.

QA gate:

- Valid signed intake succeeds in tests.
- Invalid signature, stale timestamp, duplicate nonce, wrong backend, and oversized payload fail.
- CORS is absent unless an exact trusted origin is configured.

### Step 4 — Apps Script health and provider intake

Status: **Complete** (Phase 1.4).

Create an independent MaveCode Apps Script package with explicit action routing, health, protected token intake, provider status, and revocation.

QA gate:

- Apps Script functions pass local unit tests with mocked services.
- Intake replay protection works.
- Responses never contain access or refresh tokens.
- Stored provider data can be revoked.

### Step 5 — Extension sessions

Status: **Complete** (Phase 1.5 backend scope). Provider UI and extension adapter work remain pending in Steps 7–8.

Implement allowlisted user login and short-lived MaveCode sessions for the MVP. Keep provider authorization separate from user sessions.

QA gate:

- Session creation, verification, expiration, refresh, and revocation tests pass.
- One user cannot use another user's session.
- Extension session records never contain provider credentials.

### Step 6 — Models and buffered text chat

Status: **Complete** (Phase 1.6 backend scope). Extension integration remains pending in Step 8.

Add a model catalog and buffered Codex request action. Translate between the extension's message format and the configured Codex runtime.

QA gate:

- Model capability schema passes.
- Multi-turn system/user/assistant messages serialize correctly.
- Provider errors are normalized and redacted.
- Expired provider authorization fails safely.
- Request and response size limits are enforced.

### Step 7 — Provider UI completion

Display `MaveCode` in the provider selector, show connection/readiness state, and remove inherited Zoo user-facing text from the active MaveCode path.

QA gate:

- Component tests cover signed-out, backend-unavailable, provider-unavailable, and ready states.
- Selecting and saving MaveCode persists the correct provider and model.
- Accessibility queries and keyboard selection pass.

### Step 8 — Extension backend adapter

Connect the extension to Apps Script's action protocol for the buffered MVP while preserving a separate adapter boundary for the future streaming gateway.

QA gate:

- Auth headers/session fields are applied correctly.
- Chat responses become valid extension text events.
- Abort-before-send works; UI clearly communicates that in-flight Apps Script cancellation is limited.
- Unit and integration tests pass.

### Step 9 — End-to-end MVP

Validate helper login, signed relay, backend readiness, extension login, provider selection, model loading, and text generation.

QA gate:

- Happy-path end-to-end scenario passes.
- Revocation scenario passes.
- Expiration scenario passes.
- Backend quota/error scenario passes.
- Captured extension traffic contains no provider credentials.

### Step 10 — Repository release gate

Run formatting, linting, type checks, focused tests, full tests, bundle, and VSIX packaging.

QA gate:

- All commands pass without ignored failures.
- Any environment-only warning is documented.
- Packaged extension installs under the MaveCode identity.

Status: **Complete** (Phase 1.11). The release gate passed through the sanitized-path runner where the source workspace path containing `#` prevents direct Vite release commands. The built artifact is [`../../bin/mave-code-3.76.0.vsix`](../../bin/mave-code-3.76.0.vsix).

### Step 11 — MVP documentation

Document the completed MVP accurately from the implemented helper, Apps Script backend, extension/provider adapter, mock E2E suite, and sanitized release runner. Keep all examples placeholder-only and preserve upstream attribution.

QA gate:

- Architecture, trust boundaries, deployment, operations, security, QA/release, production migration, smoke-test, troubleshooting, rollback, and upgrade docs exist under [`../README.md`](../README.md).
- Root README points to the documentation set and identifies the built VSIX.
- FORK_NOTES and existing package READMEs are reconciled without changing license/upstream attribution.
- Relative link validation by search/list passes.
- Documentation scans find no real credentials, deployment IDs, provider account IDs, OAuth client IDs, bearer tokens, refresh tokens, ID tokens, session tokens, or intake secrets.
- Completion status explicitly distinguishes code-complete/local-QA-complete from credentialed deployment smoke testing and provider approval prerequisites.

Status: **Complete** (Phase 1.12). Markdown link search/list validation passed, and secret/deployment-ID pattern scans returned placeholder-only matches.

## Definition of done

The vertical slice is code-complete and local-QA-complete: every local/mock QA gate has passed, the provider credential is absent from extension-visible traffic/storage/logs in tests, the source contains no deployment secrets, the packaged MaveCode extension artifact exists, and Phase 1.12 documentation validation is complete. Credentialed deployment smoke testing still requires private Apps Script deployment credentials, private helper configuration, real provider authorization, and provider approval review.

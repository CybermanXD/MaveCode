# MaveCode MVP operations guide

## Administrator operation

Daily or bootstrap actions:

1. Keep the helper stopped unless connecting, refreshing, relaying, or revoking provider authorization.
2. Start the helper with a private environment file or private JSON configuration.
3. Check `GET /health` on the helper for non-sensitive readiness.
4. Use `GET /auth/start` to authorize Codex through the system browser.
5. Confirm the helper relay result reports success without exposing tokens.
6. Check Apps Script `health` for provider readiness.
7. Keep Apps Script execution logs restricted and review them for redaction expectations.

Provider lifecycle actions:

| Action | How |
| --- | --- |
| Connect provider | Helper `GET /auth/start` then callback relay. |
| Re-relay current in-memory package | Helper `POST /relay`. |
| Clear helper memory | Helper `POST /logout` or stop the process. |
| Revoke backend provider auth | Apps Script `provider-revoke` as an admin user. |
| Rotate intake secret | Update Apps Script property and helper config together; restart helper. |

## User operation

User path:

1. Install [`../bin/mave-code-3.76.0.vsix`](../bin/mave-code-3.76.0.vsix).
2. Select provider `MaveCode`.
3. Configure the private Apps Script backend URL.
4. Sign in to MaveCode.
5. Select an allowlisted model from the fetched model catalog.
6. Run text chat and approve local tools as usual when tool calls are produced.
7. Sign out when finished or when access changes.

The user never receives the administrator Codex token, helper intake secret, provider refresh token, or Apps Script Script Properties.

## Revocation, rotation, and recovery

| Scenario | Response |
| --- | --- |
| User leaves allowlist | Remove email from `MAVECODE_ALLOWED_USERS`; optionally revoke active sessions. |
| Admin leaves allowlist | Remove email from `MAVECODE_ADMIN_USERS`; rotate intake secret if local config might remain accessible. |
| Extension session compromise | User signs out; admin can revoke session if token is available or lower `MAVECODE_SESSION_TTL_MS` temporarily. |
| Helper config exposure | Rotate `MAVECODE_INTAKE_SECRET`, reconfigure helper, redeploy/restart as needed. |
| Provider token exposure suspected | Revoke provider in Apps Script, revoke at provider if supported, rotate OAuth client if necessary, reconnect through helper. |
| Apps Script deployment URL exposed | Usually not secret by itself; verify access settings and HMAC/session protections, rotate intake secret if paired secrets may be exposed. |
| Apps Script Script Properties exposure | Treat as credential incident; rotate intake secret, revoke provider auth, invalidate sessions, review access logs. |
| Codex Responses endpoint behavior changes | Validate the fixed direct Apps Script integration and smoke-test buffered JSON/SSE normalization. |

## Session, allowlist, model, and quota settings

| Control | Script Property | Operational effect |
| --- | --- | --- |
| User allowlist | `MAVECODE_ALLOWED_USERS` | Lowercase comma-separated users allowed to issue sessions. |
| Admin allowlist | `MAVECODE_ADMIN_USERS` | Lowercase comma-separated admins allowed to revoke provider auth and inspect admin status. |
| Session TTL | `MAVECODE_SESSION_TTL_MS` | Short-lived access token lifetime. |
| Refresh TTL | `MAVECODE_REFRESH_TTL_MS` | Maximum session refresh window. |
| Model allowlist | `MAVECODE_MODEL_ALLOWLIST` | Exact runtime IDs returned to extension and accepted by chat. |
| Quota | `MAVECODE_QUOTA_PER_MINUTE` | Per-subject chat request limit using Apps Script cache buckets. |
| Request size | `MAVECODE_MAX_REQUEST_BYTES` | Rejects oversized intake/chat payloads. |
| Response size | `MAVECODE_MAX_RESPONSE_BYTES` | Rejects oversized provider responses. |

## Troubleshooting and error matrix

| Symptom or error code | Likely cause | Operator action |
| --- | --- | --- |
| `NOT_CONFIGURED` from extension | Backend URL missing or Apps Script property missing. | Configure backend URL in extension; verify required Script Properties. |
| `INVALID_BACKEND_URL` | URL is not HTTPS or malformed. | Use exact Apps Script web-app URL. |
| `BACKEND_UNAVAILABLE` | Apps Script URL unreachable or network failure. | Verify deployment URL, access settings, and network. |
| `BACKEND_TIMEOUT` | Apps Script or provider request exceeded extension timeout. | Retry smaller prompt; check Apps Script executions and provider latency. |
| `PROTOCOL_MISMATCH` | Backend response is not `mavecode.v1`. | Confirm extension points at MaveCode Apps Script deployment. |
| `UNAUTHENTICATED` | No active Google identity or no session token. | Sign in through extension and validate web-app access settings. |
| `SESSION_EXPIRED` | Session TTL elapsed or token invalid. | Sign in again; check `MAVECODE_SESSION_TTL_MS`. |
| `FORBIDDEN` | User not allowlisted or token belongs to another active identity. | Add lowercase email to allowlist or sign in with correct account. |
| `MODEL_NOT_ALLOWED` | Extension selected model not in allowlist. | Update model allowlist or select allowed model. |
| `PROVIDER_EXPIRED` | Provider authorization missing or expired. | Reconnect through helper; verify provider status. |
| `PROVIDER_UNAVAILABLE` | Apps Script could not call the Codex Responses endpoint. | Check provider availability and Apps Script outbound connectivity. |
| `PROVIDER_ERROR` | Codex returned non-success status. | Inspect sanitized Apps Script/provider diagnostics; avoid exposing tokens or prompts. |
| `PROVIDER_RESPONSE_TOO_LARGE` | Runtime response exceeded configured limit. | Lower prompt size, increase limit cautiously, or migrate to streaming gateway. |
| `INVALID_PROVIDER_RESPONSE` | Runtime returned unsupported JSON/SSE shape. | Verify runtime emits supported response or event structures. |
| `QUOTA_EXCEEDED` | Per-minute subject quota reached. | Wait for next bucket or adjust `MAVECODE_QUOTA_PER_MINUTE`. |
| `PAYLOAD_TOO_LARGE` | Request exceeds configured byte limit. | Reduce conversation/tool payload or adjust size limit cautiously. |
| `BUSY` | Apps Script lock could not be acquired. | Retry; investigate concurrent traffic and Apps Script quotas. |
| `STALE_SIGNATURE` | Helper timestamp outside skew window. | Sync workstation time; check `MAVECODE_MAX_SKEW_MS`. |
| `INVALID_SIGNATURE` | Secret mismatch or relay body changed. | Verify helper and Apps Script share exact intake secret. |
| `REPLAY_DETECTED` | Nonce reused. | Investigate duplicate relay, retry fresh helper request. |

## Recovery checklist

1. Preserve private logs with secrets redacted.
2. Revoke provider authorization if credential exposure is possible.
3. Rotate `MAVECODE_INTAKE_SECRET` after helper or Script Properties exposure.
4. Clear extension sessions by sign-out or by lowering TTL and removing allowlist entries.
5. Reconnect provider through the helper only after trust is restored.
6. Smoke-test health, session, models, chat, revoke, and redaction before resuming users.


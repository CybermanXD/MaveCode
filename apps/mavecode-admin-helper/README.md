# MaveCode Admin Helper

The MaveCode Admin Helper is a loopback-only service for an authorized administrator. It performs Codex OAuth authorization-code PKCE and sends the resulting provider credential package directly to one explicitly configured Apps Script deployment. Provider tokens are retained only in process memory and no local route returns them.

## Security properties

- Listens only on `127.0.0.1`; the host is not configurable.
- Requires an explicit Codex client ID, the exact registered `http://localhost:1455/auth/callback` redirect URI, an exact Apps Script deployment URL, and a 32-byte-or-longer intake secret.
- Uses a cryptographically random PKCE verifier, S256 challenge, one-time OAuth state, and a ten-minute default state expiry.
- Signs the exact relay body with HMAC-SHA256 over `timestamp.nonce.sha256(body)`. It sends metadata in both headers and query parameters because deployed Apps Script events do not reliably expose arbitrary headers; credentials remain only in the signed JSON body.
- Uses a fresh 192-bit nonce for every relay. The Apps Script receiver rejects stale timestamps and reused nonces.
- Accepts only exact `https://script.google.com/macros/s/<deployment-id>/exec` URLs and rejects redirects, query strings, fragments, credentials, and alternate hosts.
- Limits local request bodies, relay payloads, and remote responses. Logs and public errors are redacted; no CORS header is emitted unless one exact trusted origin is configured.
- Stores no provider credentials or intake secret in source control. Logout erases in-memory credentials and pending OAuth state.

The independent Apps Script receiver is implemented in `apps/mavecode-appscript`; this helper remains intentionally limited to local administrator authorization and signed relay. The full Phase 1 deployment and operations guide is in [`../../docs/deployment.md`](../../docs/deployment.md).

## Configuration

Copy `.env.example` to an ignored local file and populate every required value. Node does not implicitly load dotenv files; either export these variables in the shell or start development with Node's environment-file support:

```powershell
node --env-file=.env --import=tsx src/main.ts
```

Alternatively set `MAVECODE_CONFIG_PATH` to a private JSON file containing keys with the same uppercase names. Environment variables take precedence. Restrict that file to the administrator account. Never commit it.

The registered OAuth redirect and `MAVECODE_CODEX_REDIRECT_URI` must both exactly match `http://localhost:1455/auth/callback`. The authorize request includes the Codex-required `codex_cli_simplified_flow=true` and MaveCode identity `originator=mave-code`. The browser resolves `localhost` to the loopback callback while the actual Node listener remains security-pinned to `127.0.0.1`; do not change the redirect hostname to the numeric address. Set `MAVECODE_HELPER_PORT=1455` when this service receives the callback directly.

## Routes

| Method | Route | Behavior |
| --- | --- | --- |
| `GET` | `/health` | Returns non-sensitive readiness and relay status. |
| `GET` | `/auth/start` | Creates PKCE/state and redirects to Codex authorization. |
| `GET` | `/auth/callback` | Validates one-time state, exchanges the code, then attempts a signed relay. |
| `POST` | `/configure` | Confirms that a supplied backend URL exactly equals the startup allowlist; it cannot change the destination. |
| `POST` | `/relay` | Re-sends the in-memory credential package and returns only status metadata. |
| `POST` | `/logout` | Clears credentials and pending state. |

All other method/path combinations return `404`. There is no token-export route.

## Development and QA

From the repository root:

```powershell
pnpm install
pnpm --filter @mavecode/admin-helper test
pnpm --filter @mavecode/admin-helper lint
pnpm --filter @mavecode/admin-helper check-types
pnpm check-types
```

The helper should be run only on an administrator-controlled computer. Rotate the intake secret if its confidentiality is in doubt, and stop the helper when bootstrap or renewal is not required.

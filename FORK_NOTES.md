# MaveCode Fork Notes

## Product identity

- Product name: **MaveCode**
- Extension package: `mave-code`
- Command and configuration namespace: `mave-code`
- Source baseline: MaveCode 3.76.0

## Product direction

MaveCode is a separately branded AI coding extension and the trusted client for a centrally managed workspace. End users install the extension, authenticate once, and receive organization-approved models, personas, prompts, rules, and MCP integrations without handling provider credentials.

## Architectural boundaries

1. The extension may store MaveCode session material in VS Code secret storage, but must never receive or persist upstream AI-provider credentials.
2. All hosted model traffic must pass through the MaveCode AI Gateway using HTTPS and short-lived user authorization.
3. Authentication, workspace synchronization, AI routing, billing, and provider credentials belong to backend services.
4. Existing direct-provider integrations are inherited from upstream for development and migration. Hosted MaveCode mode should progressively hide or disable those settings for managed users.
5. Local/offline providers such as Ollama can remain available when organization policy permits them.

## Delivery sequence

### Phase 1 — Fork foundation

- Maintain the complete upstream extension, webview, CLI, tests, and workspace packages in this directory.
- Establish MaveCode package, command, settings, output-channel, and user-facing identities.
- Keep upstream notices and dependency namespaces where changing them would break compatibility.
- Produce a separately installable MaveCode VSIX.

### Phase 2 — Managed authentication and gateway

- Add browser-based OAuth login and secure token refresh.
- Add a typed MaveCode backend client.
- Route managed chat requests through the MaveCode AI Gateway.
- Remove provider-secret entry points from managed-user flows.

### Phase 3 — Workspace synchronization

- Synchronize user and team settings, modes, prompts, rules, and MCP registry entries.
- Define conflict resolution, offline caching, schema versioning, and policy enforcement.
- Add organization-aware onboarding and diagnostics.

### Phase 4 — Collaboration and enterprise services

- Shared agents and prompt library.
- Team memory and workspace templates.
- Usage, cost, rate-limit, and audit telemetry.
- Organization administration, billing, marketplace, and enterprise controls.

## Validation gates

Every implementation increment should pass formatting, linting, type checks, focused tests, the full test suite when practical, extension bundling, and VSIX packaging. Authentication and gateway work must additionally test token redaction, expiration, refresh, logout, request cancellation, retries, rate limits, and prevention of provider-secret leakage.

## Phase 1 MVP documentation

The code-complete and local-QA-complete Phase 1 MVP is documented in [`docs/README.md`](docs/README.md). The documentation distinguishes completed implementation and mock/sanitized QA from private deployment credentials, provider approval, and credentialed smoke-test prerequisites. The built local VSIX is [`bin/mave-code-3.76.0.vsix`](bin/mave-code-3.76.0.vsix).

## Upstream maintenance

Track MaveCode as the upstream source and integrate upstream changes deliberately. Rebranding should not erase historical attribution, changelog entries, licenses, translated historical content, or third-party package identities. MaveCode-specific features should remain isolated behind typed service boundaries to reduce merge conflicts.

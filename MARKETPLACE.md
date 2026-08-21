# MaveCode Live Marketplace

## Purpose

The MaveCode repository is the source of truth for the public marketplace. Standard and Enphase remain bundled in every VSIX as offline-safe personas, while signed catalogs deliver reviewed persona updates and MCP listings independently of extension releases.

The publication boundary is deliberate:

```text
reviewed repository content
  -> CI validation and secret scanning
  -> deterministic data-only packages
  -> SHA-256 digests and Ed25519 signatures
  -> atomic GitHub Pages deployment
  -> extension verification and cache
  -> managed persona activation
```

Raw mutable repository folders are never treated as installable packages by the extension.

## Repository layout

```text
marketplace/
  sources/
    personas/
      standard/marketplace.json
      enphase/marketplace.json
  keys/
    marketplace-ed25519-public.pem
  published/                 # generated; not edited by hand
    catalog-v1.json
    mcp-catalog-v1.json
    packages/*.mavepersona
scripts/
  marketplace/
    build-marketplace.mjs
.github/workflows/
  live-marketplace.yml
```

Persona source content stays in `src/assets/personas`. This avoids maintaining two copies: the same reviewed Standard and Enphase definitions, rules, and references are bundled in the VSIX and packaged by marketplace CI.

MCP listing source stays in `src/assets/marketplace/mcps.yml`. CI validates every installation template as JSON and publishes a separately signed `mcp-catalog-v1.json`. Clients prefer verified remote entries by stable ID and retain bundled entries as offline fallback.

## Package contract

A `.mavepersona` file is UTF-8 JSON, not executable code or an archive. It contains:

- schema version;
- stable persona ID and semantic display version;
- parsed persona definition;
- ordered rule files;
- ordered reference files;
- source commit and build timestamp.

Paths must be normalized relative paths. Absolute paths, traversal segments, symbolic links, unexpected files, executable hooks, and package scripts are rejected. The extension limits catalog, package, and individual file sizes before parsing.

## Catalog contract

`catalog-v1.json` contains a complete atomic snapshot. Each entry includes the stable ID, type, version, SHA-256 package digest, package URL, description, tags, compatibility floor, and package size. The catalog includes an Ed25519 signature over a deterministic canonical JSON representation with the `signature` member omitted.

The extension embeds only the public verification key. The private signing key exists solely as the protected `MARKETPLACE_ED25519_PRIVATE_KEY` GitHub Actions secret in the `marketplace-production` environment.

## Publishing Standard and Enphase

1. Edit files under `src/assets/personas/standard` or `src/assets/personas/enphase`.
2. Update the corresponding version in `src/assets/personas/manifest.yaml`. CI packages are immutable by version, so every content change must carry a version bump.
3. Open and approve a pull request.
4. Merge to `main`.
5. `live-marketplace.yml` validates, scans, packages, signs, and deploys the complete snapshot to GitHub Pages.
6. Clients fetch the catalog on Marketplace open/activation when stale, verify it, download changed packages, and atomically replace their verified cache.

If CI fails, the previous Pages deployment remains live. A partially generated marketplace is never published.

## Publishing MCP listings

1. Add or update an entry in `src/assets/marketplace/mcps.yml` using a stable lowercase ID.
2. Keep credentials as `{{PARAMETER_NAME}}` placeholders; never commit real tokens or secrets.
3. Validate every installation method as one MCP server JSON object.
4. Open and approve a pull request, then merge it to `main`.
5. `live-marketplace.yml` builds and signs `mcp-catalog-v1.json` and atomically deploys it with the persona catalog.
6. Compatible clients discover the new or updated listing on their next stale Marketplace refresh, normally within four hours of Marketplace use.

Remote MCP publication updates the listing and installation template. It never silently rewrites an MCP configuration already installed in a user's project or global settings. Users explicitly install the new listing or run Install again to replace the server entry with the reviewed template.

## Client refresh and fallback

- Refresh at most once every four hours during normal mode/persona loading.
- Use an HTTP timeout and bounded response sizes.
- Verify the catalog signature before trusting any field.
- Verify package size and SHA-256 before parsing.
- Validate every package and persona definition before activation.
- Write temporary files and rename atomically.
- Keep the last verified package if the network or publication is unavailable.
- Fall back to the VSIX-bundled persona if no verified remote package exists.
- Prefer a verified remote Standard/Enphase package over its bundled version.
- Never let a custom global or project mode shadow a managed persona slug.

Remote content is immutable to users in the same way as bundled personas. It cannot switch persona, delegate, rewrite its own rules, or mutate its package.

## Update and rollback behavior

An update is identified by package digest, with version retained for display and audit. Downloads are staged, validated, and then promoted. The previously verified cache remains untouched until promotion succeeds. Failed verification or parsing keeps the previous package active.

The generated catalog can revoke a package in a future schema revision. Until explicit revocation support is shipped, removing an item from the catalog does not delete a bundled persona or a previously verified cache; this prevents an availability failure from removing core personas.

## GitHub Pages and URLs

The workflow deploys the generated `marketplace/published` directory as the Pages artifact. The production catalog URL is:

```text
https://arkofheavean.github.io/MaveCode/catalog-v1.json
```

Package URLs are derived from that base. Repository or organization renames require an extension update or a signed redirect mechanism.

The production MCP catalog URL is:

```text
https://arkofheavean.github.io/MaveCode/mcp-catalog-v1.json
```

## Signing-key setup and rotation

Generate an Ed25519 key pair offline. Commit only the public PEM file and store the private PEM as the protected GitHub Actions secret. Require approval for the `marketplace-production` environment.

For rotation, ship an extension version that trusts both old and new key IDs, begin signing with the new key, wait through the supported extension upgrade window, and only then remove the old key. Never overwrite a public key under an existing key ID.

## CI security controls

- Pin third-party actions by commit SHA.
- Use least-privilege permissions.
- Require reviewed pull requests and CODEOWNERS approval for persona, builder, workflow, and key changes.
- Run repository secret scanning before packaging.
- Reject secret-like keys and common credential formats in marketplace source text.
- Build from a clean checkout.
- Include source commit in package metadata.
- Deploy only after all items validate and sign successfully.
- Never print the private signing key or complete signed package content in logs.

## Compatibility and VSIX releases

Persona definitions, rules, references, descriptions, and MCP listings can update through the live marketplace after this client is shipped. An updated MCP listing does not overwrite an already-installed local server automatically. Changes to extension code, schemas, cryptography, transports, UI capabilities, or security policy still require a new VSIX.

## Acceptance criteria

- A merged Standard or Enphase source change produces a different package digest.
- The next successful Pages deployment exposes one internally consistent signed catalog.
- A supported MaveCode client accepts valid updates and rejects modified catalogs or packages.
- Offline startup continues to expose Standard and Enphase.
- User custom modes cannot override managed persona IDs.
- No private signing material is committed or packaged in the VSIX.
- A failed update leaves the last verified persona usable.

# Live refresh behavior

The extension refreshes signed persona packages and MCP listings asynchronously at startup. Opening or revealing Marketplace forces network revalidation, and its visible **Refresh** action refreshes both catalogs with a deduplicated request and loading state. Background consumers retain a moderate four-hour TTL. If the network is unavailable or validation fails, the last verified cache and bundled entries remain usable.

Remote same-ID entries take precedence over bundled listings. Persona packages update managed definitions for future tasks only: active tasks remain stable and unrelated custom modes are never overwritten. MCP refresh updates Marketplace listings only; it never silently rewrites an installed server's local configuration.

Future source changes are built, signed, and deployed by the live Marketplace workflow on `main`, so compatible content can reach installed copies without publishing a new VSIX. Runtime validation enforces HTTPS GitHub Pages hosting, bounded response sizes, schema and duplicate-ID checks, minimum extension compatibility, trusted signing key and Ed25519 signatures; persona packages additionally require exact size and immutable SHA-256 digest matches.

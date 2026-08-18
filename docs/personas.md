# Bundled project personas

MaveCode ships Enphase and Standard as versioned persona bundles under `src/assets/personas`. The build copies them into the VSIX and the signed live Marketplace can deliver reviewed persona updates to compatible installed clients.

Each persona has a YAML definition, Markdown rules, and Markdown references. The manifest controls its independent version. New tasks use the persona delivered by the installed extension. Active tasks keep their selected identity.

Bundled personas are read-only, self-contained, and immutable during a task. Runtime filtering removes `switch_mode` and `new_task`; the provider also rejects direct attempts to change an active immutable persona. Use internal workflow phases and todo tracking instead of delegation.

To release an update:

1. Edit the persona's definition, rules, or references.
2. Increment that persona's version in `manifest.yaml`.
3. Run type checks, focused tests, and the extension build.
4. Review generated prompts for secrets and unsupported claims.
5. Increment the extension version and publish the VSIX/Marketplace release.

Persona learning must be reviewed and versioned. A task may propose durable lessons, but it must not automatically rewrite bundled rules or references.

# Live persona updates

MaveCode asynchronously revalidates the signed persona catalog at extension startup and whenever the Marketplace is opened or becomes visible. The Marketplace **Refresh** action forces the same non-blocking revalidation for both personas and MCP listings. A verified four-hour cache and bundled personas remain available offline; failed refreshes never erase valid cached content.

Compatible signed remote packages take precedence over same-slug bundled personas for newly created tasks. Managed persona definitions are refreshed without modifying unrelated user-authored custom modes, and an already-running task keeps the identity and rules it started with. New tasks receive the latest compatible verified managed definition. Catalogs and packages are accepted only after trusted-host, size, schema, signing-key, Ed25519 signature, version, and SHA-256 digest checks.

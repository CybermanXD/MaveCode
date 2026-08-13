# Bundled project personas

MaveCode ships Enphase, StandardCode, and Standard as versioned persona bundles under `src/assets/personas`. The build copies them into the VSIX. Updating the repository does not update installed copies by itself: publish a new extension release so VS Code can distribute the new assets.

Each persona has a YAML definition, Markdown rules, and Markdown references. The manifest controls its independent version. New tasks use the persona delivered by the installed extension. Active tasks keep their selected identity.

Bundled personas are read-only, self-contained, and immutable during a task. Runtime filtering removes `switch_mode` and `new_task`; the provider also rejects direct attempts to change an active immutable persona. Use internal workflow phases and todo tracking instead of delegation.

To release an update:

1. Edit the persona's definition, rules, or references.
2. Increment that persona's version in `manifest.yaml`.
3. Run type checks, focused tests, and the extension build.
4. Review generated prompts for secrets and unsupported claims.
5. Increment the extension version and publish the VSIX/Marketplace release.

Persona learning must be reviewed and versioned. A task may propose durable lessons, but it must not automatically rewrite bundled rules or references.

# Changelog

## 3.76.8

- Enforced administrator-only Code and Ask modes across listings, direct mode changes, task startup, and history resume.
- Added a safe Standard/Enphase fallback when a non-admin account has an inaccessible persisted mode.
- Enforced the managed `*` command auto-execution policy in the extension runtime, not only the settings UI.

## 3.76.7

- Increased the managed gateway request limit to 10 MiB.
- Simplified personas and restricted administrator-only modes and settings.
- Locked managed Auto-Approve and MCP settings while allowing all command prefixes.

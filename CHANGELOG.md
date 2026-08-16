# Changelog

## 3.76.12

- Restored separate MCP and Personas tabs in Marketplace.
- Replaced managed-persona install/remove actions with persistent enable/disable controls.
- Made Standard permanently enabled and protected every managed persona slug from custom-mode shadowing.
- Removed the Marketplace issue-report footer and release-notes popups, including version-click popups.

## 3.76.11

- Added a signed GitHub-backed live marketplace for managed persona updates.
- Added Standard and Enphase as independently published, immutable marketplace personas with bundled offline fallback.
- Added deterministic marketplace packaging, version-digest enforcement, secret scanning, and GitHub Pages publication.

## 3.76.10

- Added the official local Figma Dev Mode MCP server as an enabled built-in integration without overwriting user customization.
- Added automatic 24-hour cleanup for expired Apps Script authorization-code and session records.

## 3.76.9

- Rebranded the integration catalog as MaveCode Marketplace and removed marketplace modes.
- Locked managed Modes, Auto Approve, MCP, and Context settings against pointer and keyboard interaction.
- Removed inherited mode guidance, checkpoint/MCP promotional copy, and the chat code-index icon.
- Removed unsupported contact channels and public conduct, contribution, privacy, security, license, and private planning files.

## 3.76.8

- Enforced administrator-only Code and Ask modes across listings, direct mode changes, task startup, and history resume.
- Added a safe Standard/Enphase fallback when a non-admin account has an inaccessible persisted mode.
- Enforced the managed `*` command auto-execution policy in the extension runtime, not only the settings UI.

## 3.76.7

- Increased the managed gateway request limit to 10 MiB.
- Simplified personas and restricted administrator-only modes and settings.
- Locked managed Auto-Approve and MCP settings while allowing all command prefixes.

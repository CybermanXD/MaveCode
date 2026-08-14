# MaveCode

MaveCode is a VS Code AI coding extension with managed sign-in and bundled project personas.

## Features

- Project-focused AI coding assistance.
- Managed MaveCode gateway authentication.
- Bundled Enphase and Standard personas.
- Persona-specific rules and references.
- File editing, terminal, browser, MCP, and workspace tools.

## Figma design-to-code

MaveCode includes the official local Figma Dev Mode MCP connection. It can inspect a selected Figma frame and use its design context to implement websites, components, or email templates in the current repository.

### Recommended setup

1. Install MaveCode and reload VS Code once.
2. Install and open Figma Desktop, then sign in with an account that can access the design.
3. Open a Figma Design file, switch to Dev Mode, and enable the desktop MCP server.
4. Select the complete frame to implement and copy its link.
5. Keep Figma Desktop open, paste the frame link into MaveCode, and describe the required output.
6. Approve Figma MCP tool use if an approval prompt appears.

MaveCode automatically configures the local Figma MCP endpoint at `http://127.0.0.1:3845/sse`. No Figma API token should be added to the repository, pasted into chat, embedded in a Figma URL, or stored in MCP settings. Existing customized Figma MCP settings are preserved.

Example request:

```text
Use the connected Figma MCP server to inspect the selected frame from this URL:

<FIGMA_FRAME_URL>

Implement it as a responsive, table-based HTML email with inline CSS. Match the design closely, support major Gmail, Outlook, Apple Mail, and mobile clients, and save all generated files inside the current repository.
```

### Using only a public Figma URL

A public Figma URL can be used as a visual reference without MCP, but it is not equivalent to structured Figma access. Figma pages are dynamic applications, and a public link does not reliably expose exact node geometry, design tokens, component metadata, exported assets, font details, or inspect-mode values to MaveCode.

For a link-only workflow, make the file accessible to anyone with the link and provide the exact frame URL. Also attach exported screenshots and required image assets when visual accuracy matters. MaveCode can then recreate the design from the visible reference, but the result may require more manual comparison and adjustment. Do not place access tokens, private credentials, or restricted-file secrets in the URL or prompt.

Use Figma Dev Mode MCP when accurate design context is required. Use a public URL plus screenshots only as a fallback when Figma Desktop or MCP is unavailable.

## Install

Download the latest VSIX from GitHub Releases and install it from VS Code using **Extensions: Install from VSIX**.

<p align="center">
  <a href="https://marketplace.visualstudio.com/items?itemName=MaveCode.mave-code"><img src="https://img.shields.io/badge/VS_Code_Marketplace-007ACC?style=flat&logo=visualstudiocode&logoColor=white" alt="VS Code Marketplace"></a>
  <a href="https://x.com/MaveCodeDev"><img src="https://img.shields.io/badge/MaveCode-000000?style=flat&logo=x&logoColor=white" alt="X"></a>
  <a href="https://discord.gg/VxfP4Vx3gX"><img src="https://img.shields.io/badge/Join%20Discord-5865F2?style=flat&logo=discord&logoColor=white" alt="Join Discord"></a>
  <a href="https://www.reddit.com/r/MaveCode/"><img src="https://img.shields.io/badge/Join%20r%2FMaveCode-FF4500?style=flat&logo=reddit&logoColor=white" alt="Join r/MaveCode"></a>
  <a href="https://github.com/MaveCode-Org/MaveCode/issues"><img src="https://img.shields.io/badge/GitHub-Issues-181717?style=flat&logo=github&logoColor=white" alt="GitHub Issues"></a>
</p>
<p align="center">
  <em>Get help fast → <a href="https://discord.gg/VxfP4Vx3gX">Join Discord</a> • Prefer async? → <a href="https://www.reddit.com/r/MaveCode/">Join r/MaveCode</a></em>
</p>

# MaveCode

> Your AI-Powered Dev Team, Right in Your Editor

## We are MaveCode

> MaveCode continues development of this project after the Roo team wound down
> active Roo Code work to focus on [Roomote](https://roomote.dev/). Thank you
> to the Roo team for everything they built.
>
> The core team is a group of developers who contributed to Roo previously and
> care deeply about this plugin. We will continue to make model updates, fix
> bugs, and release features, and we plan to listen closely to the community
> that made this plugin so special. Join us on
> [Discord](https://discord.gg/VxfP4Vx3gX),
> [Reddit](https://www.reddit.com/r/MaveCode), or
> [open a PR or issue](https://github.com/MaveCode-Org/MaveCode).
>
> _-MaveCode Team_

## Roo Code to MaveCode migration

You can find a quick guide for migrating from Roo Code to MaveCode in the [Roo→Zoo migration guide](https://docs.mavecode.dev/roo-to-zoo-migration). We plan to try and help users as they transition over, we have our [Reddit](https://www.reddit.com/r/MaveCode) and [Discord](https://discord.gg/VxfP4Vx3gX)
for this exact support, so if you are having problems or if you have question, jump on and ask.

## What MaveCode Has Added Since Roo Code

MaveCode builds on the foundation created by Roo Code and continues to expand it with:

- **Semble codebase intelligence** — fast, on-demand semantic code search with automatic setup and no separate indexing workflow.
- **Stronger Orchestrator workflows** — safer delegation, parallel task coordination, reliable parent/child task recovery, and better isolation between subtasks and provider profiles.
- **Longer autonomous runs with Destructive Command Guard (DCG)** — automatically block dangerous commands while trusted work continues without repeated approval prompts.
- **The latest models** — ongoing support for new Claude, GPT, Gemini, Kimi, GLM, Grok, MiniMax, and other model families.
- **More ways to connect** — new and expanded providers including MaveCode, Moonshot, Kimi Code, Kenari, Friendli, OpenCode Go, and many more.
- **More dependable terminal and editing workflows** — fixes for premature terminal completion, task-state races, context management, diff editing, and provider-specific tool use.
- **More control over your workspace** — rules management, per-mode MCP restrictions, multi-root path controls, model reasoning options, and completion change review actions.

## What's New in v3.76.0

- **Run longer, uninterrupted tasks with Destructive Command Guard (DCG)** — DCG blocks dangerous commands while letting Zoo keep working without you continuously pressing approval buttons, backed by hardened managed-binary downloads and installation.
- **Better provider controls and reliability** — choose OpenAI Codex response speed, use updated DeepSeek configurations, and benefit from stronger isolation between provider-profile changes and running tasks.
- **Critical terminal execution fix** — Zoo now waits for terminal commands to finish before starting the next step, preventing overlapping work and premature model continuation.
- Smarter batching groups related tool approvals while keeping unrelated requests separate.
- Telemetry delivery and model-cache fetching are more resilient under failures and concurrent requests.

<details>
  <summary>🌐 Available languages</summary>

- [English](README.md)
- [Català](locales/ca/README.md)
- [Deutsch](locales/de/README.md)
- [Español](locales/es/README.md)
- [Français](locales/fr/README.md)
- [हिंदी](locales/hi/README.md)
- [Bahasa Indonesia](locales/id/README.md)
- [Italiano](locales/it/README.md)
- [日本語](locales/ja/README.md)
- [한국어](locales/ko/README.md)
- [Nederlands](locales/nl/README.md)
- [Polski](locales/pl/README.md)
- [Português (BR)](locales/pt-BR/README.md)
- [Русский](locales/ru/README.md)
- [Türkçe](locales/tr/README.md)
- [Tiếng Việt](locales/vi/README.md)
- [简体中文](locales/zh-CN/README.md)
- [繁體中文](locales/zh-TW/README.md)

</details>

---

## What Can MaveCode Do For YOU?

- Generate Code from natural language descriptions and specs
- Adapt with Modes: Code, Architect, Ask, Debug, and Custom Modes
- Refactor & Debug existing code
- Write & Update documentation
- Answer Questions about your codebase
- Automate repetitive tasks
- Utilize MCP Servers

## Modes

MaveCode adapts to how you work:

- Code Mode: everyday coding, edits, and file ops
- Architect Mode: plan systems, specs, and migrations
- Ask Mode: fast answers, explanations, and docs
- Debug Mode: trace issues, add logs, isolate root causes
- Custom Modes: build specialized modes for your team or workflow

Learn more: [Using Modes](https://docs.mavecode.dev/basic-usage/using-modes) •
[Custom Modes](https://docs.mavecode.dev/advanced-usage/custom-modes)

## Resources

- **[Documentation](https://docs.mavecode.dev):** The official guide to
  installing, configuring, and mastering MaveCode.
- **[MaveCode MVP docs](docs/README.md):** Phase 1.12 documentation for the
  implemented Admin Helper, Apps Script backend, MaveCode provider, local QA,
  deployment smoke tests, security review, and production migration plan.
- **Built VSIX:** The local Phase 1 release artifact is
  [`bin/mave-code-3.76.0.vsix`](bin/mave-code-3.76.0.vsix).
- **[Discord Server](https://discord.gg/VxfP4Vx3gX):** Join the community for
  real-time help and discussion.
- **[Reddit Community](https://www.reddit.com/r/MaveCode/):** Share your
  experiences and see what others are building.
- **[GitHub Issues](https://github.com/MaveCode-Org/MaveCode/issues):** Report
  bugs and track development.
- **[Feature Requests](https://github.com/MaveCode-Org/MaveCode/discussions/categories/feature-requests?discussions_q=is%3Aopen+category%3A%22Feature+Requests%22+sort%3Atop):**
  Have an idea? Share it with the developers.

---

## Local Setup & Development

1. **Clone** the repo:

```sh
git clone https://github.com/MaveCode-Org/MaveCode.git
```

2. **Install dependencies**:

```sh
pnpm install
```

3. **Run the extension**:

There are several ways to run the MaveCode extension:

### Development Mode (F5)

For active development, use VSCode's built-in debugging:

Press `F5` (or go to **Run** → **Start Debugging**) in VSCode. This will open a
new VSCode window with the MaveCode extension running.

- Changes to the webview will appear immediately.
- Changes to the core extension will also hot reload automatically.

### Automated VSIX Installation

To build and install the extension as a VSIX package directly into VSCode:

```sh
pnpm install:vsix [-y] [--editor=<command>]
```

This command will:

- Ask which editor command to use (code/cursor/code-insiders) - defaults to
  'code'
- Uninstall any existing version of the extension.
- Build the latest VSIX package.
- Install the newly built VSIX.
- Prompt you to restart VS Code for changes to take effect.

Options:

- `-y`: Skip all confirmation prompts and use defaults
- `--editor=<command>`: Specify the editor command (e.g., `--editor=cursor` or
  `--editor=code-insiders`)

### Manual VSIX Installation

If you prefer to install the VSIX package manually:

1. First, build the VSIX package:
    ```sh
    pnpm vsix
    ```
2. A `.vsix` file will be generated in the `bin/` directory (e.g.,
   `bin/mave-code-<version>.vsix`).
3. Install it manually using the VSCode CLI:
    ```sh
    code --install-extension bin/mave-code-<version>.vsix
    ```

---

We use [changesets](https://github.com/changesets/changesets) for versioning and
publishing. Check our `CHANGELOG.md` for release notes.

---

## Disclaimer

**Please note** that MaveCode does **not** make any representations or
warranties regarding any code, models, or other tools provided or made available
in connection with MaveCode, any associated third-party tools, or any resulting
outputs. You assume **all risks** associated with the use of any such tools or
outputs; such tools are provided on an **"AS IS"** and **"AS AVAILABLE"** basis.
Such risks may include, without limitation, intellectual property infringement,
cyber vulnerabilities or attacks, bias, inaccuracies, errors, defects, viruses,
downtime, property loss or damage, and/or personal injury. You are solely
responsible for your use of any such tools or outputs (including, without
limitation, the legality, appropriateness, and results thereof).

---

## Contributing

We love community contributions! Get started by reading our
[CONTRIBUTING.md](CONTRIBUTING.md).

---

## License

[Apache 2.0 © 2026 MaveCode Org](./LICENSE)

---

**Enjoy MaveCode!** Whether you keep it on a short leash or let it roam
autonomously, we can’t wait to see what you build. If you have questions or
feature ideas, drop by our [Reddit community](https://www.reddit.com/r/MaveCode/)
or [Discord](https://discord.gg/VxfP4Vx3gX), or open an
[issue](https://github.com/MaveCode-Org/MaveCode/issues). Happy coding!

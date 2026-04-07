<p align="center">
  <img src="logo.png" alt="Anvil" width="128" height="128">
</p>

<h1 align="center">Anvil</h1>

<p align="center">
  A cross-platform desktop app for managing AI agent skills.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-v2-blue" alt="Built with Tauri">
  <img src="https://img.shields.io/badge/React-19-61dafb" alt="React">
  <img src="https://img.shields.io/badge/Rust-backend-orange" alt="Rust">
</p>

---

Anvil gives you a single interface to create, edit, and manage SKILL.md files across all your AI coding agents. Instead of hunting through dotfile directories, you get a three-panel editor with live reloading, a marketplace for discovering community skills, and one-click updates.

## Features

**Skill management** — Create, edit, duplicate, delete, enable/disable skills from one place. Changes are written atomically and picked up by agents immediately.

**Multi-agent support** — 40+ agents detected automatically. Install a skill to any combination of agents via symlink or copy. Colored dots show which agents have each skill at a glance.

**Live editor** — CodeMirror-powered markdown editor with syntax highlighting, search, and frontmatter form. Unsaved changes are tracked with a visual indicator.

**Marketplace** — Search the [skills.sh](https://skills.sh) registry, browse results with install counts, and install globally with one click.

**Update center** — Background checks for outdated skills. View side-by-side diffs before updating. Update individually or all at once.

**File watcher** — Monitors all agent skill directories. External edits are reflected in Anvil within 500ms.

**Command palette** — `Cmd+K` to search skills, switch agents, open settings, or jump to marketplace/updates.

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)
- [Bun](https://bun.sh/)

### Development

```bash
bun install
bun run tauri dev
```

### Build

```bash
bun run tauri build
```

### Platform support

Anvil is supported and tested on macOS only.

Linux and Windows builds may be published in GitHub Releases, but they are currently untested and unsupported.

### Unsigned macOS release

If macOS blocks the app after you move it to `/Applications`, clear the quarantine flag:

```bash
xattr -dr com.apple.quarantine /Applications/Anvil.app
```

## Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+K` | Command palette |
| `Cmd+N` | Create new skill |
| `Cmd+S` | Save current skill |
| `Cmd+,` | Settings |
| `Cmd+Shift+M` | Marketplace |
| `Cmd+Shift+U` | Updates |
| `Arrow Up/Down` | Navigate skill list |

## Supported agents

Anvil automatically detects installed agents by checking for their config directories. The full list of 40+ supported agents is defined in [`agents.json`](src-tauri/src/data/agents.json) and includes Claude Code, Codex, Cursor, Gemini CLI, Windsurf, Amp, GitHub Copilot, Roo Code, Cline, Goose, and many more.

Only agents that are actually installed on your machine appear in the sidebar. Custom agents can be added via `~/.anvil/config.json`.

> [!TIP]
> Hover over an agent in the sidebar to see its skills directory path. Right-click to copy it.

## Marketplace

Anvil shells out to [`npx skills`](https://skills.sh) for marketplace operations and marketplace-managed removals.

- **Search** — finds skills from the skills.sh registry
- **Install** — downloads to `~/.agents/skills/` vault, symlinks to all detected agents
- **Update** — compares local hashes against remote, pulls latest versions
- **Remove** — uninstalls marketplace-managed skills globally or from a specific agent

> [!NOTE]
> Marketplace features require Node.js. If the CLI isn't available, Anvil shows a setup banner in the marketplace view.

## Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | [Tauri v2](https://v2.tauri.app) |
| Backend | Rust |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| UI components | [shadcn/ui](https://ui.shadcn.com) |
| State management | [Zustand](https://zustand.docs.pmnd.rs) 5 |
| Editor | [CodeMirror](https://codemirror.net) 6 |

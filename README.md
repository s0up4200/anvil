<p align="center">
  <img src="logo.png" alt="Anvil" width="128" height="128">
</p>

<h1 align="center">Anvil</h1>

<p align="center">
  A cross-platform desktop app for managing AI agent skills.
</p>

---

Anvil gives you a single interface to create, edit, and manage SKILL.md files across all your AI coding agents — Claude Code, Codex, Gemini CLI, Windsurf, Amp, OpenCode, and VS Code Copilot.

Instead of hunting through dotfile directories, you get a three-panel editor with live reloading, a marketplace for discovering community skills, and one-click updates.

![Built with Tauri](https://img.shields.io/badge/Tauri-v2-blue)
![React](https://img.shields.io/badge/React-19-61dafb)
![Rust](https://img.shields.io/badge/Rust-backend-orange)

## Features

**Skill management** — Create, edit, duplicate, delete, enable/disable skills from one place. Changes are written atomically and picked up by agents immediately.

**Multi-agent support** — Seven agents detected out of the box. Install a skill to any combination of agents via symlink or copy. Colored dots show which agents have each skill at a glance.

**Live editor** — CodeMirror-powered markdown editor with syntax highlighting, search, and frontmatter form (description, user-invocable toggle, argument hints). Unsaved changes are tracked with a visual indicator.

**Marketplace** — Search the [skills.sh](https://skills.sh) registry, browse results with install counts, and install globally with one click. Skills are installed to a central vault (`~/.agents/skills/`) and auto-symlinked to all detected agents.

**Update center** — Background checks for outdated skills. View side-by-side diffs of local vs. remote versions before updating. Update individually or all at once with streamed progress.

**File watcher** — Monitors all agent skill directories. External edits (from your terminal, editor, or CLI) are reflected in Anvil within 500ms.

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

| Agent | Skills directory |
|-------|-----------------|
| Claude Code | `~/.claude/skills` |
| Codex | `~/.codex/skills` |
| OpenCode | `~/.config/opencode/skills` |
| Gemini CLI | `~/.gemini/skills` |
| Windsurf | `~/.windsurf/skills` |
| Amp | `~/.amp/skills` |
| VS Code Copilot | `~/.github/skills` |

An agent is "detected" when its skills directory exists on disk. Custom agents can be added via `~/.anvil/config.json`.

## Marketplace

Anvil shells out to [`npx skills`](https://skills.sh) for marketplace operations. The CLI must be available on your PATH.

- **Search**: finds skills from the skills.sh registry
- **Install**: downloads to `~/.agents/skills/` vault, symlinks to all detected agents
- **Update**: compares local hashes against remote, pulls latest versions

> [!NOTE]
> Marketplace features require Node.js installed. If the CLI isn't available, Anvil shows a setup banner in the marketplace view.

## Stack

| Layer | Technology |
|-------|-----------|
| Desktop framework | [Tauri v2](https://v2.tauri.app) |
| Backend | Rust |
| Frontend | React 19, TypeScript, Tailwind CSS 4 |
| UI components | [shadcn/ui](https://ui.shadcn.com) |
| State management | [Zustand](https://zustand.docs.pmnd.rs) 5 |
| Editor | [CodeMirror](https://codemirror.net) 6 |

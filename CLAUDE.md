# Anvil

Cross-platform desktop app for managing AI agent skills. Tauri v2 + React 19.

## Stack

- Backend: Rust (src-tauri/) — Tauri v2 IPC commands
- Frontend: React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand 5, CodeMirror 6
- YAML: serde_norway (Rust), gray-matter (TypeScript)

## Commands

- `bun install` — install dependencies
- `bun run tauri dev` — development
- `bun run tauri build` — production build
- `bun run -- tsc --noEmit` — TypeScript type check
- `cargo test` — Rust tests (run from src-tauri/)
- `bun vitest` — frontend tests

## Architecture

```
src-tauri/src/
  commands/    # Tauri IPC handlers (agents, skills, settings, watcher, marketplace)
  services/    # Pure logic: parser, scanner, symlink, skills_cli, lockfile, updater
  models/      # Data structs: agent, skill, config, marketplace
  error.rs     # AppError enum (Io, YamlParse, NotFound, etc.)
  lib.rs       # App builder, command registration, state setup
src/
  components/  # layout/, editor/, skills/, settings/, marketplace/, ui/ (shadcn)
  hooks/       # useSkills, useAgents, useKeyboard, useFileWatcher, useMarketplace, useUpdateChecker
  stores/      # Zustand: uiStore, skillStore, agentStore, marketplaceStore, updateStore
  lib/tauri.ts # Type-safe IPC invoke wrappers
  types/       # TypeScript interfaces
```

## Conventions

- Rust commands in src-tauri/src/commands/, one file per domain
- Rust services in src-tauri/src/services/, pure logic (no Tauri deps)
- Frontend components use shadcn/ui primitives from @/components/ui/
- Zustand stores hold state only, no async — hooks handle IPC calls
- Path alias: @/ maps to src/
- All file writes use atomic .tmp + rename pattern (create, update, config save)

## skills CLI (npx skills) — How It Works

The marketplace shells out to `npx skills`. Key behaviors:

- **Vault**: `~/.agents/skills/` is the central store for globally-installed skills
- **Symlinks**: Agent dirs (e.g. `~/.claude/skills/resend`) get relative symlinks → `../../.agents/skills/resend`
- **Lockfile**: `~/.agents/.skill-lock.json` (v3) tracks source, hash, install/update timestamps
- **`-a <agent>`** installs to a single agent via copy (no vault intermediary)
- **`--all`** installs to vault + symlinks to all known agents
- **`npx skills find <query>`** works non-interactively, returns ANSI output with `owner/repo@skill` + install counts
- **`npx skills check`** compares installed hashes against remote; output contains "All skills are up to date" or `↑ <name>` lines
- **`npx skills list -g --json`** outputs machine-readable JSON of installed skills

### DANGER: `npx skills remove --all` removes ALL skills, not just the named one
The `--all` flag on `remove` means "all skills from all agents" — it is NOT scoped to the skill name argument. Never use `--all` with `remove` unless you intend to wipe everything. Use `-a <agent> -s <skill> -y` for targeted removal.

### Scanner picks up marketplace skills through agent dir symlinks
The scanner does NOT scan `~/.agents/skills/` directly. It finds marketplace skills because agent dirs contain symlinks that `fs::canonicalize()` resolves to the vault. The `SkillSource` will be `Native` (not `Symlink`) because the SKILL.md file inside the symlinked directory is a real file — only the parent directory is a symlink.

## Gotchas

- Skill frontmatter max 1024 bytes (enforced in parser.rs)
- Skill toggle: renames SKILL.md ↔ SKILL.md.disabled (not a flag)
- Skills deduped by resolved symlink path — same skill across agents shows once
- 7 hardcoded agents (claude-code, codex, opencode, gemini-cli, windsurf, amp, vscode-copilot); custom agents via ~/.anvil/config.json
- Windows symlinks need elevated privileges (error 1314 → fallback to copy)
- File watcher debounces 500ms, only fires for files containing "SKILL.md"

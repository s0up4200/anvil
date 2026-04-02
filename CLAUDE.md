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
- `cargo test` — Rust tests (run from src-tauri/)
- `bun vitest` — frontend tests

## Architecture

```
src-tauri/src/
  commands/    # Tauri IPC handlers (agents, skills, settings, watcher)
  services/    # Pure logic: parser, scanner, symlink (no Tauri deps)
  models/      # Data structs: agent, skill, config
  error.rs     # AppError enum (Io, YamlParse, NotFound, etc.)
  lib.rs       # App builder, command registration, state setup
src/
  components/  # layout/, editor/, skills/, settings/, ui/ (shadcn)
  hooks/       # useSkills, useAgents, useKeyboard, useFileWatcher
  stores/      # Zustand: uiStore, skillStore, agentStore
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

## Gotchas

- Skill frontmatter max 1024 bytes (enforced in parser.rs)
- Skill toggle: renames SKILL.md ↔ SKILL.md.disabled (not a flag)
- Skills deduped by resolved symlink path — same skill across agents shows once
- 7 hardcoded agents (claude-code, codex, opencode, gemini-cli, windsurf, amp, vscode-copilot); custom agents via ~/.anvil/config.json
- Windows symlinks need elevated privileges (error 1314 → fallback to copy)
- File watcher debounces 500ms, only fires for files containing "SKILL.md"

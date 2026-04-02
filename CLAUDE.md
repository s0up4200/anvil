# Anvil

Cross-platform desktop app for managing AI agent skills. Tauri v2 + React 19.

## Stack

- Backend: Rust (src-tauri/) — Tauri v2 IPC commands
- Frontend: React 19, TypeScript, Tailwind CSS 4, shadcn/ui, Zustand 5, CodeMirror 6
- YAML: serde_norway (Rust), gray-matter (TypeScript)

## Commands

- `npm run tauri dev` — development
- `npm run tauri build` — production build
- `cargo test` — Rust tests (run from src-tauri/)
- `npx vitest` — frontend tests

## Conventions

- Rust commands in src-tauri/src/commands/, one file per domain
- Rust services in src-tauri/src/services/, pure logic (no Tauri deps)
- Frontend components use shadcn/ui primitives from @/components/ui/
- Zustand stores hold state only, no async — hooks handle IPC calls
- Path alias: @/ maps to src/

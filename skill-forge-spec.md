# Anvil — Product Spec

> A cross-platform desktop app for managing AI agent skills.
> Browse, create, edit, delete, and sync skills across every major coding agent — with a built-in marketplace powered by skills.sh.

**Stack**: Tauri v2 · React 19 · Vite · TypeScript · Tailwind CSS 4 · shadcn/ui · Zustand · CodeMirror 6

---

## 1. Problem

AI coding agents (Claude Code, Codex, Cursor, Gemini CLI, OpenCode, Windsurf, Amp, etc.) all support the Agent Skills spec — `SKILL.md` files with YAML frontmatter. But managing these skills is painful:

- **Scattered locations**: Each agent reads from its own directory (`~/.claude/skills/`, `~/.codex/skills/`, `.cursor/rules/`, etc.). No unified view.
- **No GUI**: The only way to manage skills is hand-editing markdown files and running CLI commands.
- **Discovery is CLI-only**: `npx skills add` works but there's no visual way to browse skills.sh, read descriptions, compare options.
- **No visibility into state**: Which skills are installed? Where? Are they global or project-scoped? Symlinked or copied? Enabled or disabled?
- **No cross-agent sync**: Installing a skill for Claude Code doesn't install it for Codex. You end up duplicating manually.

**Chops** (macOS-only, Swift) and **Skill Manager** (Tauri, early-stage) partially address this. Neither is cross-platform Tauri with full skills.sh integration and the polish bar we're targeting.

---

## 2. Target User

Developers who:
- Use 2+ AI coding agents daily
- Have accumulated 10-50+ skills across agents
- Care about their tools looking and feeling good
- Run Linux, macOS, or Windows (selfhosted crowd matters)

---

## 3. Design Direction

**Aesthetic**: Linear meets Raycast. Clean, dense, keyboard-first. Dark mode default with light mode support. No rounded-everything softness — sharp, confident, utilitarian with moments of delight.

**Principles**:
- **Speed**: App opens in <1s. Skill list renders instantly. Search is local and synchronous.
- **Density**: Show maximum useful info without clutter. Sidebar + list + detail three-pane layout.
- **Keyboard-first**: `⌘K` command palette, arrow navigation, `⌘S` save, `⌘N` new skill.
- **Non-destructive**: Deletes go to trash/undo. Edits show diffs before saving. No surprises.

---

## 4. Architecture

```
anvil/
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── main.rs         # App entry, Tauri setup
│   │   ├── commands/       # IPC command handlers
│   │   │   ├── skills.rs   # CRUD operations on local skills
│   │   │   ├── agents.rs   # Agent detection & path resolution
│   │   │   ├── marketplace.rs  # skills.sh API / npx skills bridge
│   │   │   ├── watcher.rs  # Filesystem watching (notify crate)
│   │   │   └── settings.rs # App config persistence
│   │   ├── models/         # Shared types
│   │   │   ├── skill.rs    # Skill struct (parsed SKILL.md)
│   │   │   ├── agent.rs    # Agent enum + paths
│   │   │   └── config.rs   # App settings
│   │   └── services/
│   │       ├── scanner.rs    # Discover skills across all agent dirs
│   │       ├── parser.rs     # YAML frontmatter + markdown body parser
│   │       ├── symlink.rs    # Symlink resolution & dedup logic
│   │       ├── skills_cli.rs # Wrapper around `npx skills` commands
│   │       ├── updater.rs    # Background update checker (spawns thread, runs `npx skills check`)
│   │       └── lockfile.rs   # Parse ~/.agents/.skill-lock.json for hash/source tracking
│   ├── Cargo.toml
│   └── tauri.conf.json
├── src/                    # React frontend
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── ui/             # shadcn/ui primitives
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx         # Agent filter + navigation
│   │   │   ├── SkillList.tsx       # Filterable/searchable skill list
│   │   │   ├── SkillDetail.tsx     # View/edit pane
│   │   │   └── CommandPalette.tsx  # ⌘K modal
│   │   ├── editor/
│   │   │   ├── SkillEditor.tsx     # CodeMirror 6 markdown editor
│   │   │   ├── FrontmatterForm.tsx # Structured YAML editing (name, description, metadata)
│   │   │   └── PreviewPane.tsx     # Live markdown preview
│   │   ├── marketplace/
│   │   │   ├── MarketplaceBrowser.tsx  # skills.sh discovery UI
│   │   │   ├── SkillCard.tsx          # Marketplace result card
│   │   │   ├── InstallDialog.tsx      # Agent target picker for install
│   │   │   ├── UpdateCenter.tsx       # List of skills with available updates
│   │   │   ├── SkillDiffView.tsx      # Side-by-side diff (local vs remote)
│   │   │   └── UpdateProgress.tsx     # Streaming stdout log during update
│   │   └── settings/
│   │       ├── SettingsView.tsx
│   │       ├── AgentPaths.tsx      # Custom scan path config
│   │       └── Appearance.tsx      # Theme, font size, etc.
│   ├── stores/
│   │   ├── skillStore.ts    # Zustand — skill state, filters, selection
│   │   ├── agentStore.ts    # Zustand — detected agents, paths
│   │   ├── marketStore.ts   # Zustand — marketplace search/results
│   │   ├── updateStore.ts   # Zustand — pending updates, check status, last checked
│   │   └── uiStore.ts       # Zustand — sidebar state, command palette, theme
│   ├── hooks/
│   │   ├── useSkills.ts     # React Query or SWR wrapper for Tauri commands
│   │   ├── useAgents.ts
│   │   ├── useKeyboard.ts   # Global keyboard shortcut handler
│   │   ├── useFileWatcher.ts # Tauri event listener for FS changes
│   │   └── useUpdateChecker.ts # Listens for skill-updates-available events
│   ├── lib/
│   │   ├── tauri.ts         # Typed invoke() wrappers
│   │   ├── frontmatter.ts   # Client-side YAML parse/stringify
│   │   └── constants.ts     # Agent definitions, paths, colors
│   └── styles/
│       └── globals.css       # Tailwind base + CSS variables
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── CLAUDE.md                # Agent instructions for working on this project
```

### Why this split?

| Concern | Where | Why |
|---------|-------|-----|
| Filesystem scanning | Rust (scanner.rs) | Fast, recursive, handles symlinks natively |
| YAML/frontmatter parsing | Rust (parser.rs) | `serde_yaml` is rock solid, no Node dependency |
| File watching | Rust (notify crate) | Native FSEvents/inotify/ReadDirectoryChanges |
| `npx skills` execution | Rust (skills_cli.rs) | `Command::new()` with stdout/stderr capture |
| UI rendering | React | Your strength, shadcn/ui ecosystem |
| Markdown editing | CodeMirror 6 | Lightweight, extensible, great markdown mode |
| State management | Zustand | Minimal boilerplate, works great with Tauri IPC |

---

## 5. Feature Spec — Phased

### Phase 1: Local Skill Manager (MVP)

The core loop: see all your skills, edit them, create new ones, delete ones you don't want.

#### 5.1 Agent Detection
- On launch, scan for known agent installations by checking standard paths:

| Agent | Global Skills Path | Project Skills Path |
|-------|-------------------|-------------------|
| Claude Code | `~/.claude/skills/` | `.claude/skills/` |
| Codex | `~/.codex/skills/` | `.codex/skills/` |
| ~~Cursor~~ | ~~`~/.cursor/rules/`~~ | ~~`.cursor/rules/`~~ | *(Dropped — `.mdc` format won't converge)* |
| OpenCode | `~/.config/opencode/skills/` | `.opencode/skills/` |
| Gemini CLI | `~/.gemini/skills/` | `.agents/skills/` |
| Windsurf | `~/.windsurf/skills/` | `.windsurf/skills/` |
| Amp | `~/.amp/skills/` | `.amp/skills/` |
| VS Code Copilot | `~/.github/skills/` | `.github/skills/` |

- Show detected agents in sidebar with install status indicators
- Allow custom path additions for agents we don't auto-detect (config-based: `{ name, globalPath, projectPath }`)
- User sets a "projects root" directory (e.g. `~/Projects/`) — Anvil recursively discovers project-level skill dirs within it
- Persist detected config in `~/.anvil/config.json`

#### 5.2 Skill Scanning & Indexing
- Recursively scan all detected agent directories for `SKILL.md` files
- Parse YAML frontmatter: `name`, `description`, `metadata` (including `internal` flag)
- Resolve symlinks to detect shared/deduplicated skills (Vercel CLI creates these)
- Build in-memory index with:
  - Skill name, description, file path, resolved path
  - Which agents have this skill installed
  - Global vs project scope
  - Last modified timestamp
  - File size / line count
- Re-scan on filesystem events (debounced, 500ms)

#### 5.3 Skill List View
- Three-pane layout: Sidebar (agents/filters) → List (skills) → Detail (view/edit)
- List columns: Name, description (truncated), agents (icon badges), scope (global/project), modified date
- Filtering: by agent, by scope, by search query (fuzzy match on name + description + body)
- Sorting: name, modified date, agent count
- Multi-select for bulk operations (delete, copy-to-agent)
- Empty state with "Create your first skill" CTA

#### 5.4 Skill Editor
- Split view: structured frontmatter form (top) + CodeMirror markdown editor (bottom)
- Frontmatter form fields:
  - `name` — text input with slug validation (lowercase, hyphens)
  - `description` — textarea, character count shown (descriptions matter for activation)
  - `metadata.internal` — toggle
  - Custom metadata — key/value editor
- CodeMirror 6 with:
  - Markdown syntax highlighting
  - Line numbers
  - Word wrap toggle
  - Basic keybindings (undo/redo, indent, etc.)
  - Search/replace (`⌘F` / `⌘H`)
- Live preview pane (toggle-able) rendering the markdown body
- Dirty state indicator (dot on tab, `⌘S` to save)
- Save writes back to the original file path immediately (no diff confirmation)
- Undo via `⌘Z` in editor; file-level revert via git or backup

#### 5.5 Skill CRUD
- **Create**: `⌘N` opens dialog → pick name, target agent(s), scope (global/project dir) → scaffolds `SKILL.md` with frontmatter template → opens in editor
- **Edit**: Click skill in list → opens in editor pane
- **Delete**: `⌘⌫` or context menu → confirmation dialog → moves to OS trash (not hard delete)
- **Duplicate**: Context menu → creates copy with `-copy` suffix
- **Toggle**: Enable/disable a skill without deleting (renames to `SKILL.md.disabled`)

#### 5.6 Cross-Agent Install
- Right-click a skill → "Install to..." → pick target agents
- Prompts user to choose symlink or copy per-install
- Symlink recommended (one source of truth, matches skills.sh behavior)
- Shows which agents already have the skill installed

#### 5.7 Command Palette
- `⌘K` opens Raycast-style command palette
- Actions: New skill, Open skill by name, Switch agent filter, Open settings, Open marketplace
- Recent skills section
- Fuzzy search across all actions and skill names

#### 5.8 Settings
- **Agent paths**: Override auto-detected paths, add custom agents
- **Appearance**: Dark/light/system theme, font size, editor font family
- **Behavior**: Default scope for new skills, confirm before delete, auto-scan interval
- **Data**: Export all skills as zip, import skills from zip

---

### Phase 2: Marketplace (skills.sh Integration)

#### 5.9 Marketplace Browser
- Dedicated tab/view for browsing skills.sh
- Search bar with results from skills.sh registry
- Skill cards showing: name, description, source repo, install count, GitHub stars
- Click card → expanded view with full SKILL.md preview
- Filter by: category/tag, agent compatibility, popularity

#### 5.10 Install from Marketplace
- "Install" button on marketplace skill → agent picker dialog
- Under the hood: runs `npx skills add <package> --skill <name> -a <agent> -g -y`
- Shows install progress with stdout streaming
- After install, skill appears in local list immediately (via FS watcher)
- Track installed marketplace skills separately (show update availability later)

#### 5.11 Skill Updates & Background Check System

The skills CLI already has the primitives we need:
- `npx skills check` — compares installed skill hashes against live GitHub state
- `npx skills update` — pulls latest versions for all outdated skills
- `~/.agents/.skill-lock.json` — lockfile (v3) storing `skillFolderHash` per skill for diff detection

**Background update checker** (Rust-side):
- On app launch, run `npx skills check --yes` and parse stdout
- User can also trigger manually via "Check for updates" button
- No background polling — check on launch + on-demand only
- Capture which skills have updates available and store in app state
- Emit a Tauri event (`skill-updates-available`) to the frontend with the list
- Never auto-update — always show the user what changed first

**Frontend update UX**:
- Skills with available updates get a badge/dot in the skill list (subtle, not disruptive)
- Global indicator in the sidebar or header: "3 updates available" pill
- Click the pill → opens an **Update Center** view showing:
  - Skill name, current version/hash, source repo
  - "View changes" button → fetches the remote SKILL.md and shows a side-by-side diff against local
  - Per-skill "Update" button + "Update all" bulk action
- Update action runs `npx skills update --yes` (or targeted per-skill if the CLI supports it)
- Stream stdout/stderr into a progress log in the UI
- After update completes, FS watcher picks up the changes and refreshes the skill list automatically

**Lockfile integration**:
- Read `~/.agents/.skill-lock.json` on scan to enrich marketplace-installed skills with:
  - Source repo URL
  - Installed hash (for staleness detection)
  - Install timestamp
- Skills installed via Anvil also go through `npx skills add` so the lockfile stays consistent — we never bypass the CLI for marketplace operations

**Notification preferences** (Settings):
- Notify on updates: in-app badge
- Auto-dismiss after update applied

---

### Phase 3: Multi-Agent Sync & Templates

#### 5.12 Sync Groups
- Create "sync groups" — a set of agents that should share the same skills
- When a skill is added/removed from one agent in the group, propagate to others
- Uses symlinks for zero-copy sync
- Conflict resolution: if skill exists in target with different content, show diff

#### 5.13 Skill Templates
- Built-in templates for common skill patterns:
  - Code style / linting conventions
  - Deployment workflow
  - Testing patterns
  - PR/commit message format
  - Framework-specific (React, Go, Python, etc.)
- "Create from template" in the new skill dialog
- User can save any skill as a personal template

#### 5.14 Import/Export
- Export skill or collection as `.zip` compatible with `npx skills add <local-path>`
- Import from GitHub URL (fetches repo, shows available skills, installs selected)
- Drag-and-drop `.md` files into the app to import

---

## 6. IPC Contract (Tauri Commands)

These are the Rust→Frontend bridge functions invoked via `invoke()`:

```typescript
// Agent detection
invoke<Agent[]>('detect_agents')
invoke<Agent>('add_custom_agent', { name, globalPath, projectPath })

// Skill scanning
invoke<Skill[]>('scan_all_skills')
invoke<Skill[]>('scan_agent_skills', { agentId })
invoke<Skill>('get_skill', { path })

// Skill CRUD
invoke<Skill>('create_skill', { name, description, body, agentId, scope })
invoke<void>('update_skill', { path, frontmatter, body })
invoke<void>('delete_skill', { path })  // moves to trash
invoke<void>('duplicate_skill', { path })
invoke<void>('toggle_skill', { path, enabled })

// Cross-agent operations
invoke<void>('install_skill_to_agent', { sourcePath, agentId, method: 'symlink' | 'copy' })
invoke<void>('uninstall_skill_from_agent', { path, agentId })

// Marketplace (Phase 2)
invoke<MarketplaceSkill[]>('search_marketplace', { query })
invoke<void>('install_from_marketplace', { package, skill, agents })
invoke<SkillUpdate[]>('check_skill_updates')       // runs `npx skills check`, returns outdated list
invoke<void>('update_skill', { skillName })         // runs targeted update for one skill
invoke<void>('update_all_skills')                   // runs `npx skills update --yes`
invoke<SkillLockEntry[]>('read_skill_lockfile')     // parses ~/.agents/.skill-lock.json
invoke<SkillDiff>('diff_remote_skill', { skillName }) // fetches remote SKILL.md, diffs against local

// Background update checker (events, not commands)
listen<SkillUpdate[]>('skill-updates-available', callback)  // emitted by background checker

// Settings
invoke<AppConfig>('get_config')
invoke<void>('save_config', { config })

// File watching (events, not commands)
listen<SkillChangeEvent>('skill-changed', callback)
listen<SkillChangeEvent>('skill-created', callback)
listen<SkillChangeEvent>('skill-deleted', callback)
```

---

## 7. Data Models

```typescript
interface Agent {
  id: string              // e.g. 'claude-code', 'codex', 'cursor'
  name: string            // Display name
  detected: boolean       // Auto-detected on this system
  globalSkillsPath: string
  projectSkillsPaths: string[]  // May vary by project
  icon: string            // Agent logo/icon identifier
  color: string           // Brand color for badges
  supportsSymlinks: boolean
  // Cursor dropped — no .mdc support
}

interface Skill {
  id: string              // Hash of resolved path
  name: string            // From frontmatter
  description: string     // From frontmatter
  body: string            // Markdown content after frontmatter
  filePath: string        // Absolute path to SKILL.md
  resolvedPath: string    // Symlink-resolved path (for dedup)
  agents: string[]        // Agent IDs this skill is installed in
  scope: 'global' | 'project'
  projectDir?: string     // If project-scoped, which project
  metadata: Record<string, unknown>
  isInternal: boolean
  isEnabled: boolean
  lastModified: string    // ISO timestamp
  fileSize: number
  lineCount: number
  source?: 'local' | 'marketplace'
  marketplaceRef?: string // e.g. 'vercel-labs/agent-skills@frontend-design'
}

interface MarketplaceSkill {
  package: string         // e.g. 'vercel-labs/agent-skills'
  skill: string           // Skill name within package
  description: string
  installCount: number
  repoUrl: string
  stars: number
  lastUpdated: string
}

interface SkillUpdate {
  skillName: string
  localHash: string       // From skill-lock.json
  remoteHash: string      // From `npx skills check`
  sourceRepo: string
  installedAt: string     // ISO timestamp from lockfile
}

interface SkillDiff {
  skillName: string
  localContent: string    // Current SKILL.md
  remoteContent: string   // Latest from source repo
  // Frontend renders a side-by-side or unified diff from these
}

interface SkillLockEntry {
  skillName: string
  skillFolderHash: string
  sourceRepo: string
  installedAt: string
  agents: string[]        // Which agents this is linked to
}

interface AppConfig {
  theme: 'dark' | 'light' | 'system'
  fontSize: number
  editorFontFamily: string
  projectsRoot: string        // e.g. '~/Projects' — auto-discover project skills
  defaultScope: 'global' | 'project'
  confirmBeforeDelete: boolean
  customAgents: Agent[]       // Config-based agent definitions (name, globalPath, projectPath)
  syncGroups: SyncGroup[]
}
```

---

## 8. Keyboard Shortcuts

> On Windows/Linux, `⌘` maps to `Ctrl`.

| Shortcut | Action |
|----------|--------|
| `⌘K` | Command palette |
| `⌘N` | New skill |
| `⌘S` | Save current skill |
| `⌘⌫` | Delete selected skill(s) |
| `⌘F` | Search/filter skill list (or find in editor) |
| `⌘D` | Duplicate selected skill |
| `⌘,` | Open settings |
| `⌘1-9` | Switch agent filter |
| `↑/↓` | Navigate skill list |
| `Enter` | Open selected skill in editor |
| `Esc` | Close dialog/palette, deselect |
| `⌘⇧P` | Open marketplace |
| `⌘⇧U` | Open update center |

---

## 9. Technical Decisions & Rationale

| Decision | Choice | Why |
|----------|--------|-----|
| Framework | Tauri v2 | ~10MB bundle, native webview, Rust backend for FS ops |
| Frontend | React 19 + Vite | Anders' core stack, massive ecosystem |
| Styling | Tailwind 4 + shadcn/ui | Fast iteration, consistent design tokens, accessible primitives |
| State | Zustand | Minimal API, works perfectly with Tauri IPC patterns |
| Editor | CodeMirror 6 | Lightweight (~150KB), excellent markdown mode, extensible |
| FS Watching | `notify` crate (Rust) | Cross-platform native events, no polling |
| YAML Parsing | `serde_yaml` (Rust) + `gray-matter` (TS) | Parse in Rust for scanning, in TS for live editor preview |
| Marketplace | Shell out to `npx skills` | Don't reimplement — leverage existing CLI, stay compatible |
| Skill toggle | Rename to `SKILL.md.disabled` | Reversible, no data loss, agents ignore non-SKILL.md files |
| Trash | OS-native trash via `trash` crate | Recoverable deletes, cross-platform |
| Config | JSON in `~/.anvil/config.json` | Simple, human-readable, easy to backup |
| Auto-update | Tauri's built-in updater | GitHub Releases as update source |
| Skill updates | Shell out to `npx skills check/update` | Leverages existing lockfile + hash diffing, stays compatible |
| Diff rendering | `diff` crate (Rust) or `jsdiff` (TS) | Side-by-side diff of SKILL.md before applying updates |

---

## 10. Resolved Decisions

- [x] **App name**: **Anvil**
- [x] **Cursor .mdc support**: **Dropped** — Cursor's `.mdc` format is divergent, not worth supporting
- [x] **Project-scoped scanning**: User sets a **projects root** dir, Anvil recursively discovers project-level skill dirs
- [x] **skills.sh API**: **Shell out to `npx skills`** — simplest, stays compatible
- [x] **Diff before save**: **No** — `⌘Z` undo is sufficient
- [x] **Plugin system**: **Config-based only** — users define `{ name, globalPath, projectPath }` in settings
- [x] **Symlink vs copy**: **Ask each time** — user picks per cross-agent install
- [x] **Update check frequency**: **On launch + manual** — no background polling
- [x] **Skill toggle**: **Rename to `SKILL.md.disabled`**
- [x] **Cross-platform shortcuts**: **`⌘` → `Ctrl`** on Windows/Linux, no custom keybindings

---

## 11. MVP Scope (Phase 1 Deliverable)

Ship when these work end-to-end:

1. ✅ Auto-detect installed agents and scan their skill directories
2. ✅ Three-pane UI: sidebar (agents) → skill list → editor
3. ✅ Create new skills with proper SKILL.md scaffolding
4. ✅ Edit skills with CodeMirror + frontmatter form
5. ✅ Delete skills (to OS trash)
6. ✅ Search/filter across all skills
7. ✅ Install skill to additional agents via symlink
8. ✅ Filesystem watching with live refresh
9. ✅ Command palette (`⌘K`)
10. ✅ Dark/light theme
11. ✅ Builds for macOS, Linux, Windows

**Not in MVP**: Marketplace, sync groups, templates, auto-update checking.

---

## 12. Success Metrics

- **Adoption**: 500+ GitHub stars within 3 months (realistic for the niche)
- **Retention**: Users who open the app 3+ times per week
- **Skill count**: Average user manages 15+ skills through the app
- **Cross-platform**: At least 20% of users on Linux
- **Community**: Listed on skills.sh, mentioned in Claude Code / Codex communities

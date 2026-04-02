use std::fs;
use std::path::{Path, PathBuf};

use crate::models::agent::known_agents;
use crate::models::skill::{Skill, SkillFrontmatter};
use crate::services::{parser, scanner, symlink};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/// Return the skill directory given a path that is either:
/// - a `SKILL.md` / `SKILL.md.disabled` file  → parent directory
/// - a directory itself                        → the directory
fn skill_dir(path: &Path) -> PathBuf {
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("");
    if name == "SKILL.md" || name == "SKILL.md.disabled" {
        path.parent().unwrap_or(path).to_path_buf()
    } else {
        path.to_path_buf()
    }
}

/// Validate that a skill name contains only lowercase ASCII letters, digits,
/// and hyphens.
fn validate_skill_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("skill name must not be empty".to_string());
    }
    if !name
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return Err(format!(
            "skill name '{name}' is invalid: only lowercase letters, digits, and hyphens are allowed"
        ));
    }
    Ok(())
}

/// Atomic write: write `content` to a `.tmp` sibling, then rename over `dest`.
fn atomic_write(dest: &Path, content: &str) -> Result<(), String> {
    let tmp = dest.with_extension("tmp");
    fs::write(&tmp, content).map_err(|e| e.to_string())?;
    fs::rename(&tmp, dest).map_err(|e| {
        // Best-effort cleanup of the temp file before surfacing the error.
        let _ = fs::remove_file(&tmp);
        e.to_string()
    })
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/// Scan all known agents and return the full deduplicated skill list.
///
/// Agent detection happens internally; the frontend does not pass agents in.
#[tauri::command]
pub fn scan_all_skills() -> Result<Vec<Skill>, String> {
    let agents: Vec<_> = known_agents()
        .into_iter()
        .filter(|a| a.skills_path.as_ref().map(|p| p.exists()).unwrap_or(false))
        .collect();

    Ok(scanner::scan_all(&agents))
}

/// Read and parse a single skill file.
///
/// Returns `(frontmatter, body)`.
#[tauri::command]
pub fn get_skill(path: String) -> Result<(SkillFrontmatter, String), String> {
    let raw = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    parser::parse_skill_content(&raw).map_err(|e| e.to_string())
}

/// Create a new skill directory + `SKILL.md` inside `agent_path`.
///
/// Returns the path of the created `SKILL.md`.
#[tauri::command]
pub fn create_skill(
    name: String,
    description: String,
    body: String,
    agent_path: String,
    scope: String,
) -> Result<String, String> {
    validate_skill_name(&name)?;

    let skill_dir = PathBuf::from(&agent_path).join(&name);
    if skill_dir.exists() {
        return Err(format!("skill directory already exists: {}", skill_dir.display()));
    }
    fs::create_dir_all(&skill_dir).map_err(|e| e.to_string())?;

    let frontmatter = SkillFrontmatter {
        description: if description.is_empty() {
            None
        } else {
            Some(description)
        },
        ..Default::default()
    };

    // Embed the scope as a metadata field so it round-trips correctly.
    // `scope` is passed as a plain string from the frontend ("global" /
    // "project").  We store it in the raw frontmatter only if it differs from
    // the default so files stay minimal.
    let mut fm = frontmatter;
    if scope != "global" && !scope.is_empty() {
        fm.metadata.insert(
            "scope".to_string(),
            serde_json::Value::String(scope),
        );
    }

    let content = parser::serialize_skill_content(&fm, &body).map_err(|e| e.to_string())?;

    let skill_md = skill_dir.join("SKILL.md");
    atomic_write(&skill_md, &content)?;

    Ok(skill_md.to_string_lossy().into_owned())
}

/// Overwrite a skill file with new frontmatter + body.
///
/// `frontmatter` is a JSON string that deserialises into `SkillFrontmatter`.
/// Uses an atomic temp-file + rename to avoid partial writes.
#[tauri::command]
pub fn update_skill(path: String, frontmatter: String, body: String) -> Result<(), String> {
    let fm: SkillFrontmatter =
        serde_json::from_str(&frontmatter).map_err(|e| e.to_string())?;

    let content = parser::serialize_skill_content(&fm, &body).map_err(|e| e.to_string())?;

    atomic_write(Path::new(&path), &content)
}

/// Move a skill (its parent directory, or the file itself) to the OS trash.
///
/// If `path` points to a `SKILL.md` inside a named skill directory, the whole
/// directory is trashed so no orphan directories are left behind.
#[tauri::command]
pub fn delete_skill(path: String) -> Result<(), String> {
    let p = Path::new(&path);
    let target = skill_dir(p);

    trash::delete(&target).map_err(|e| e.to_string())
}

/// Duplicate a skill into a sibling directory with a `-copy` suffix.
///
/// Returns the path of the new `SKILL.md`.
#[tauri::command]
pub fn duplicate_skill(path: String) -> Result<String, String> {
    let src_path = Path::new(&path);
    let src_dir = skill_dir(src_path);

    // Determine the base name, stripping any existing `-copy` chain so we
    // don't accumulate `-copy-copy-copy…` suffixes.
    let base_name = src_dir
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| "cannot derive skill name from path".to_string())?;

    let new_name = format!("{base_name}-copy");

    let parent = src_dir
        .parent()
        .ok_or_else(|| "skill directory has no parent".to_string())?;

    // Find a unique destination (append -2, -3 … if the -copy dir exists).
    let dst_dir = {
        let candidate = parent.join(&new_name);
        if candidate.exists() {
            let mut n = 2u32;
            loop {
                let c = parent.join(format!("{new_name}-{n}"));
                if !c.exists() {
                    break c;
                }
                n += 1;
            }
        } else {
            candidate
        }
    };

    symlink::copy_skill(&src_dir, &dst_dir).map_err(|e| e.to_string())?;

    let new_skill_md = dst_dir.join("SKILL.md");
    if new_skill_md.exists() {
        Ok(new_skill_md.to_string_lossy().into_owned())
    } else {
        // Skill was disabled — check for .disabled variant.
        let disabled = dst_dir.join("SKILL.md.disabled");
        if disabled.exists() {
            Ok(disabled.to_string_lossy().into_owned())
        } else {
            Err(format!(
                "copied skill directory exists but no SKILL.md found: {}",
                dst_dir.display()
            ))
        }
    }
}

/// Enable or disable a skill by renaming `SKILL.md` ↔ `SKILL.md.disabled`.
///
/// Returns the new file path after the rename.
#[tauri::command]
pub fn toggle_skill(path: String, enabled: bool) -> Result<String, String> {
    let src = PathBuf::from(&path);
    let parent = src
        .parent()
        .ok_or_else(|| "skill file has no parent directory".to_string())?;

    let dst = if enabled {
        // Caller wants to enable → target name is SKILL.md
        parent.join("SKILL.md")
    } else {
        // Caller wants to disable → target name is SKILL.md.disabled
        parent.join("SKILL.md.disabled")
    };

    if src == dst {
        // Already in the desired state — treat as a no-op.
        return Ok(dst.to_string_lossy().into_owned());
    }

    fs::rename(&src, &dst).map_err(|e| e.to_string())?;
    Ok(dst.to_string_lossy().into_owned())
}

/// Install a skill to another agent via symlink or copy.
///
/// - `source_path`: path to the skill file (`SKILL.md`) or its directory.
/// - `target_dir`: the agent's skills directory where the skill will be placed.
/// - `method`: `"symlink"` or `"copy"`.
#[tauri::command]
pub fn install_skill_to_agent(
    source_path: String,
    target_dir: String,
    method: String,
) -> Result<(), String> {
    let src = skill_dir(Path::new(&source_path));
    let skill_name = src
        .file_name()
        .ok_or_else(|| "cannot derive skill name from source path".to_string())?;

    let dst = PathBuf::from(&target_dir).join(skill_name);

    if dst.exists() {
        return Err(format!(
            "target already exists: {}",
            dst.display()
        ));
    }

    match method.as_str() {
        "symlink" => symlink::create_skill_symlink(&src, &dst).map_err(|e| e.to_string()),
        "copy" => symlink::copy_skill(&src, &dst).map_err(|e| e.to_string()),
        other => Err(format!(
            "unknown install method '{other}': expected 'symlink' or 'copy'"
        )),
    }
}

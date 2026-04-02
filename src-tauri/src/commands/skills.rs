use std::fs;
use std::path::{Path, PathBuf};

use crate::error::AppError;
use crate::models::agent::known_agents;
use crate::models::skill::{Skill, SkillFrontmatter};
use crate::services::{fs as svc_fs, parser, scanner, symlink};

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
    if scanner::SKILL_FILES.iter().any(|(f, _)| *f == name) {
        path.parent().unwrap_or(path).to_path_buf()
    } else {
        path.to_path_buf()
    }
}

/// Validate that a skill name contains only lowercase ASCII letters, digits,
/// and hyphens.
fn validate_skill_name(name: &str) -> Result<(), AppError> {
    if name.is_empty() {
        return Err(AppError::InvalidInput("skill name must not be empty".to_string()));
    }
    if !name
        .chars()
        .all(|c| c.is_ascii_lowercase() || c.is_ascii_digit() || c == '-')
    {
        return Err(AppError::InvalidInput(format!(
            "skill name '{name}' is invalid: only lowercase letters, digits, and hyphens are allowed"
        )));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Commands
// ---------------------------------------------------------------------------

/// Scan all known agents and return the full deduplicated skill list.
///
/// Agent detection happens internally; the frontend does not pass agents in.
#[tauri::command]
pub fn scan_all_skills() -> Result<Vec<Skill>, AppError> {
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
pub fn get_skill(path: String) -> Result<(SkillFrontmatter, String), AppError> {
    let raw = fs::read_to_string(&path)?;
    parser::parse_skill_content(&raw)
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
) -> Result<String, AppError> {
    validate_skill_name(&name)?;

    let skill_dir = PathBuf::from(&agent_path).join(&name);
    if skill_dir.exists() {
        return Err(AppError::InvalidInput(format!(
            "skill directory already exists: {}",
            skill_dir.display()
        )));
    }
    fs::create_dir_all(&skill_dir)?;

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

    let content = parser::serialize_skill_content(&fm, &body)?;

    let skill_md = skill_dir.join("SKILL.md");
    svc_fs::atomic_write(&skill_md, &content)?;

    Ok(skill_md.to_string_lossy().into_owned())
}

/// Overwrite a skill file with new frontmatter + body.
///
/// `frontmatter` is a JSON string that deserialises into `SkillFrontmatter`.
/// Uses an atomic temp-file + rename to avoid partial writes.
#[tauri::command]
pub fn update_skill(path: String, frontmatter: String, body: String) -> Result<(), AppError> {
    let fm: SkillFrontmatter = serde_json::from_str(&frontmatter)?;

    let content = parser::serialize_skill_content(&fm, &body)?;

    svc_fs::atomic_write(Path::new(&path), &content)
}

/// Move a skill (its parent directory, or the file itself) to the OS trash.
///
/// If `path` points to a `SKILL.md` inside a named skill directory, the whole
/// directory is trashed so no orphan directories are left behind.
#[tauri::command]
pub fn delete_skill(path: String) -> Result<(), AppError> {
    let p = Path::new(&path);
    let target = skill_dir(p);

    trash::delete(&target).map_err(|e| AppError::Io(e.to_string()))
}

/// Duplicate a skill into a sibling directory with a `-copy` suffix.
///
/// Returns the path of the new `SKILL.md`.
#[tauri::command]
pub fn duplicate_skill(path: String) -> Result<String, AppError> {
    let src_path = Path::new(&path);
    let src_dir = skill_dir(src_path);

    // Determine the base name, stripping any existing `-copy` chain so we
    // don't accumulate `-copy-copy-copy…` suffixes.
    let base_name = src_dir
        .file_name()
        .and_then(|n| n.to_str())
        .ok_or_else(|| AppError::Path("cannot derive skill name from path".to_string()))?;

    let new_name = format!("{base_name}-copy");

    let parent = src_dir
        .parent()
        .ok_or_else(|| AppError::Path("skill directory has no parent".to_string()))?;

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

    symlink::copy_skill(&src_dir, &dst_dir)?;

    let new_skill_md = dst_dir.join("SKILL.md");
    if new_skill_md.exists() {
        Ok(new_skill_md.to_string_lossy().into_owned())
    } else {
        // Skill was disabled — check for .disabled variant.
        let disabled = dst_dir.join("SKILL.md.disabled");
        if disabled.exists() {
            Ok(disabled.to_string_lossy().into_owned())
        } else {
            Err(AppError::NotFound(format!(
                "copied skill directory exists but no SKILL.md found: {}",
                dst_dir.display()
            )))
        }
    }
}

/// Enable or disable a skill by renaming `SKILL.md` ↔ `SKILL.md.disabled`.
///
/// Returns the new file path after the rename.
#[tauri::command]
pub fn toggle_skill(path: String, enabled: bool) -> Result<String, AppError> {
    let src = PathBuf::from(&path);
    let parent = src
        .parent()
        .ok_or_else(|| AppError::Path("skill file has no parent directory".to_string()))?;

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

    fs::rename(&src, &dst)?;
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
) -> Result<(), AppError> {
    let src = skill_dir(Path::new(&source_path));
    let skill_name = src
        .file_name()
        .ok_or_else(|| AppError::Path("cannot derive skill name from source path".to_string()))?;

    let dst = PathBuf::from(&target_dir).join(skill_name);

    if dst.exists() {
        return Err(AppError::InvalidInput(format!(
            "target already exists: {}",
            dst.display()
        )));
    }

    match method.as_str() {
        "symlink" => symlink::create_skill_symlink(&src, &dst),
        "copy" => symlink::copy_skill(&src, &dst),
        other => Err(AppError::InvalidInput(format!(
            "unknown install method '{other}': expected 'symlink' or 'copy'"
        ))),
    }
}

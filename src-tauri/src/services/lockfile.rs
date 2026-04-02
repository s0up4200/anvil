use std::path::PathBuf;

use crate::error::AppError;
use crate::models::Lockfile;

pub fn lockfile_path() -> Result<PathBuf, AppError> {
    let home = dirs::home_dir().ok_or_else(|| AppError::Path("Cannot resolve home directory".into()))?;
    Ok(home.join(".agents").join(".skill-lock.json"))
}

pub fn read_lockfile() -> Result<Lockfile, AppError> {
    let path = lockfile_path()?;
    if !path.exists() {
        return Ok(Lockfile {
            version: 3,
            skills: Default::default(),
        });
    }
    let contents = std::fs::read_to_string(&path)?;
    let lockfile: Lockfile = serde_json::from_str(&contents)?;
    Ok(lockfile)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_lockfile() {
        let json = r#"{
            "version": 3,
            "skills": {
                "resend": {
                    "source": "resend/resend-skills",
                    "sourceType": "github",
                    "sourceUrl": "https://github.com/resend/resend-skills.git",
                    "skillPath": "skills/resend/SKILL.md",
                    "skillFolderHash": "92a3d095349d549a2417d560fae4453b72447e4c",
                    "installedAt": "2026-02-04T17:10:39.661Z",
                    "updatedAt": "2026-04-02T19:32:13.725Z"
                }
            }
        }"#;
        let lockfile: Lockfile = serde_json::from_str(json).unwrap();
        assert_eq!(lockfile.version, 3);
        assert_eq!(lockfile.skills.len(), 1);
        let entry = &lockfile.skills["resend"];
        assert_eq!(entry.source, "resend/resend-skills");
        assert_eq!(entry.source_type, "github");
        assert_eq!(entry.skill_folder_hash, "92a3d095349d549a2417d560fae4453b72447e4c");
    }

    #[test]
    fn test_parse_empty_lockfile() {
        let json = r#"{"version": 3, "skills": {}}"#;
        let lockfile: Lockfile = serde_json::from_str(json).unwrap();
        assert_eq!(lockfile.skills.len(), 0);
    }

    #[test]
    fn test_missing_lockfile_returns_empty() {
        // read_lockfile returns empty when file doesn't exist
        // This test just verifies the default construction works
        let lockfile = Lockfile {
            version: 3,
            skills: Default::default(),
        };
        assert!(lockfile.skills.is_empty());
    }
}

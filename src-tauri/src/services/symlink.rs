use std::fs;
use std::path::{Path, PathBuf};

use crate::error::AppError;

/// Returns the canonical (absolute, symlink-resolved) path.
pub fn resolve_path(path: &Path) -> Result<PathBuf, AppError> {
    fs::canonicalize(path).map_err(|e| {
        AppError::Path(format!("failed to canonicalize {}: {}", path.display(), e))
    })
}

/// Returns true if `path` itself is a symlink (does not follow the link).
pub fn is_symlink(path: &Path) -> bool {
    fs::symlink_metadata(path)
        .map(|m| m.file_type().is_symlink())
        .unwrap_or(false)
}

/// Creates a symlink at `dst` pointing to `src`.
///
/// On Windows, error 1314 (privilege not held) is mapped to
/// `AppError::SymlinkPermissionDenied`.
pub fn create_skill_symlink(src: &Path, dst: &Path) -> Result<(), AppError> {
    #[cfg(unix)]
    {
        std::os::unix::fs::symlink(src, dst).map_err(AppError::from)
    }

    #[cfg(windows)]
    {
        use std::io;
        let result = if src.is_dir() {
            std::os::windows::fs::symlink_dir(src, dst)
        } else {
            std::os::windows::fs::symlink_file(src, dst)
        };
        result.map_err(|e| {
            if e.raw_os_error() == Some(1314) {
                AppError::SymlinkPermissionDenied(format!(
                    "creating symlink {} -> {}: privilege not held (error 1314)",
                    dst.display(),
                    src.display()
                ))
            } else {
                AppError::from(e)
            }
        })
    }

    #[cfg(not(any(unix, windows)))]
    {
        Err(AppError::InvalidInput(
            "symlink creation is not supported on this platform".to_string(),
        ))
    }
}

/// Copies `src` to `dst`.
///
/// If `src` is a directory, copies recursively. If `src` is a file, copies
/// the single file.
pub fn copy_skill(src: &Path, dst: &Path) -> Result<(), AppError> {
    if src.is_dir() {
        copy_dir_recursive(src, dst)
    } else {
        fs::copy(src, dst)
            .map(|_| ())
            .map_err(AppError::from)
    }
}

fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), AppError> {
    fs::create_dir_all(dst).map_err(AppError::from)?;

    for entry in fs::read_dir(src).map_err(AppError::from)? {
        let entry = entry.map_err(AppError::from)?;
        let src_path = entry.path();
        let dst_path = dst.join(entry.file_name());

        if src_path.is_dir() {
            copy_dir_recursive(&src_path, &dst_path)?;
        } else {
            fs::copy(&src_path, &dst_path)
                .map(|_| ())
                .map_err(AppError::from)?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use tempfile::tempdir;

    #[test]
    fn resolve_regular_file() {
        let dir = tempdir().unwrap();
        let file_path = dir.path().join("test.txt");
        fs::write(&file_path, b"hello").unwrap();

        let resolved = resolve_path(&file_path).unwrap();
        // canonical path should exist and be absolute
        assert!(resolved.is_absolute());
        assert!(resolved.exists());
    }

    #[test]
    #[cfg(unix)]
    fn resolve_symlink() {
        let dir = tempdir().unwrap();
        let target = dir.path().join("target.txt");
        let link = dir.path().join("link.txt");

        fs::write(&target, b"data").unwrap();
        std::os::unix::fs::symlink(&target, &link).unwrap();

        let resolved = resolve_path(&link).unwrap();
        let target_canonical = fs::canonicalize(&target).unwrap();

        assert_eq!(resolved, target_canonical);
    }

    #[test]
    #[cfg(unix)]
    fn create_and_verify_symlink() {
        let dir = tempdir().unwrap();
        let target = dir.path().join("skill_dir");
        let link = dir.path().join("skill_link");

        fs::create_dir_all(&target).unwrap();
        fs::write(target.join("skill.md"), b"# My Skill").unwrap();

        create_skill_symlink(&target, &link).unwrap();

        assert!(is_symlink(&link));
        assert!(link.join("skill.md").exists());
    }

    #[test]
    fn copy_skill_dir() {
        let dir = tempdir().unwrap();
        let src = dir.path().join("src_skill");
        let dst = dir.path().join("dst_skill");

        fs::create_dir_all(&src).unwrap();
        fs::write(src.join("skill.md"), b"# Skill").unwrap();
        fs::write(src.join("config.yaml"), b"key: value").unwrap();

        let nested = src.join("nested");
        fs::create_dir_all(&nested).unwrap();
        fs::write(nested.join("helper.md"), b"# Helper").unwrap();

        copy_skill(&src, &dst).unwrap();

        assert!(dst.join("skill.md").exists());
        assert!(dst.join("config.yaml").exists());
        assert!(dst.join("nested").join("helper.md").exists());

        assert_eq!(fs::read(dst.join("skill.md")).unwrap(), b"# Skill");
        assert_eq!(fs::read(dst.join("config.yaml")).unwrap(), b"key: value");
        assert_eq!(
            fs::read(dst.join("nested").join("helper.md")).unwrap(),
            b"# Helper"
        );
    }
}

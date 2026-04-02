use std::fs;
use std::path::Path;

use crate::error::AppError;

/// Atomic write: write `content` to a `.tmp` sibling, then rename over `dest`.
pub fn atomic_write(dest: &Path, content: &str) -> Result<(), AppError> {
    let tmp = dest.with_extension("tmp");
    fs::write(&tmp, content)?;
    fs::rename(&tmp, dest).map_err(|e| {
        // Best-effort cleanup of the temp file before surfacing the error.
        let _ = fs::remove_file(&tmp);
        AppError::from(e)
    })
}

use serde::Serialize;
use thiserror::Error;

#[derive(Debug, Error, Serialize)]
#[serde(tag = "kind", content = "message", rename_all = "camelCase")]
pub enum AppError {
    #[error("I/O error: {0}")]
    Io(String),

    #[error("YAML parse error: {0}")]
    YamlParse(String),

    #[error("JSON error: {0}")]
    Json(String),

    #[error("Path error: {0}")]
    Path(String),

    #[error("Not found: {0}")]
    NotFound(String),

    #[error("Invalid input: {0}")]
    InvalidInput(String),

    #[error("Frontmatter too large: {0} bytes (max 1024)")]
    FrontmatterTooLarge(usize),

    #[error("Symlink permission denied: {0}")]
    SymlinkPermissionDenied(String),

    #[error("CLI not found: {0}")]
    CliNotFound(String),

    #[error("CLI error: {0}")]
    CliError(String),
}

impl From<std::io::Error> for AppError {
    fn from(e: std::io::Error) -> Self {
        AppError::Io(e.to_string())
    }
}

impl From<serde_json::Error> for AppError {
    fn from(e: serde_json::Error) -> Self {
        AppError::Json(e.to_string())
    }
}

// Note: `From<AppError> for tauri::ipc::InvokeError` is provided automatically
// by Tauri's blanket `impl<T: Serialize> From<T> for InvokeError`, since
// `AppError` derives `Serialize`.

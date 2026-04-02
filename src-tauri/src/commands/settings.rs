use std::fs;

use crate::error::AppError;
use crate::models::config::AppConfig;
use crate::services::fs as svc_fs;

/// Returns the path to `~/.anvil/config.json`, or an error if the home
/// directory cannot be resolved.
fn config_path() -> Result<std::path::PathBuf, AppError> {
    let home = dirs::home_dir()
        .ok_or_else(|| AppError::Path("could not resolve home directory".to_string()))?;
    Ok(home.join(".anvil").join("config.json"))
}

/// Reads `~/.anvil/config.json` and returns the parsed [`AppConfig`].
/// Returns [`AppConfig::default()`] when the file does not exist.
#[tauri::command]
pub fn get_config() -> Result<AppConfig, AppError> {
    let path = config_path()?;

    if !path.exists() {
        return Ok(AppConfig::default());
    }

    let contents = fs::read_to_string(&path)?;
    let config: AppConfig = serde_json::from_str(&contents)?;
    Ok(config)
}

/// Persists `config` to `~/.anvil/config.json` using an atomic write
/// (write to a `.tmp` file then rename).
#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), AppError> {
    let path = config_path()?;

    // Ensure the parent directory exists.
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    let json = serde_json::to_string_pretty(&config)?;

    svc_fs::atomic_write(&path, &json)
}

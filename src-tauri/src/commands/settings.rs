use std::fs;

use crate::models::config::AppConfig;

/// Returns the path to `~/.anvil/config.json`, or an error string if the home
/// directory cannot be resolved.
fn config_path() -> Result<std::path::PathBuf, String> {
    let home = dirs::home_dir().ok_or_else(|| "could not resolve home directory".to_string())?;
    Ok(home.join(".anvil").join("config.json"))
}

/// Reads `~/.anvil/config.json` and returns the parsed [`AppConfig`].
/// Returns [`AppConfig::default()`] when the file does not exist.
#[tauri::command]
pub fn get_config() -> Result<AppConfig, String> {
    let path = config_path()?;

    if !path.exists() {
        return Ok(AppConfig::default());
    }

    let contents = fs::read_to_string(&path).map_err(|e| e.to_string())?;
    serde_json::from_str(&contents).map_err(|e| e.to_string())
}

/// Persists `config` to `~/.anvil/config.json` using an atomic write
/// (write to a `.tmp` file then rename).
#[tauri::command]
pub fn save_config(config: AppConfig) -> Result<(), String> {
    let path = config_path()?;

    // Ensure the parent directory exists.
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }

    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;

    // Atomic write: write to a sibling .tmp file then rename into place.
    let tmp_path = path.with_extension("json.tmp");
    fs::write(&tmp_path, &json).map_err(|e| e.to_string())?;
    fs::rename(&tmp_path, &path).map_err(|e| e.to_string())?;

    Ok(())
}

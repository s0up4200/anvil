pub mod commands;
pub mod error;
pub mod models;
pub mod services;

use std::sync::Mutex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Mutex::new(commands::watcher::WatcherState { handle: None }))
        .invoke_handler(tauri::generate_handler![
            commands::agents::detect_agents,
            commands::settings::get_config,
            commands::settings::save_config,
            commands::watcher::start_file_watcher,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

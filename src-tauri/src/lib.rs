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
            commands::skills::scan_all_skills,
            commands::skills::get_skill,
            commands::skills::create_skill,
            commands::skills::update_skill,
            commands::skills::delete_skill,
            commands::skills::duplicate_skill,
            commands::skills::toggle_skill,
            commands::skills::install_skill_to_agent,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

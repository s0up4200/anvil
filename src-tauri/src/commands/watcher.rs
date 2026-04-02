use notify_debouncer_mini::{
    new_debouncer,
    notify::{RecommendedWatcher, RecursiveMode},
    DebouncedEventKind, Debouncer,
};
use serde::Serialize;
use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SkillChangeEvent {
    pub path: String,
    pub event_type: String,
}

pub struct WatcherState {
    pub handle: Option<Debouncer<RecommendedWatcher>>,
}

#[tauri::command]
pub fn start_file_watcher(app: AppHandle, paths: Vec<String>) -> Result<(), String> {
    let state = app.state::<Mutex<WatcherState>>();

    let (tx, rx) = std::sync::mpsc::channel();

    let mut debouncer = new_debouncer(Duration::from_millis(500), tx)
        .map_err(|e| e.to_string())?;

    for path_str in &paths {
        let path = Path::new(path_str);
        if !path.exists() {
            continue;
        }
        debouncer
            .watcher()
            .watch(path, RecursiveMode::Recursive)
            .map_err(|e| e.to_string())?;
    }

    let app_clone = app.clone();
    std::thread::spawn(move || {
        for result in rx {
            match result {
                Ok(events) => {
                    for event in events {
                        if event.kind == DebouncedEventKind::Any {
                            let path_str = event.path.to_string_lossy().to_string();
                            if path_str.contains("SKILL.md") {
                                let payload = SkillChangeEvent {
                                    path: path_str,
                                    event_type: "changed".to_string(),
                                };
                                let _ = app_clone.emit("skill-changed", payload);
                            }
                        }
                    }
                }
                Err(_) => break,
            }
        }
    });

    let mut watcher_state = state.lock().map_err(|e| e.to_string())?;
    watcher_state.handle = Some(debouncer);

    Ok(())
}

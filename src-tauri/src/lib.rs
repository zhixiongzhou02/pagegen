pub mod models;
pub mod project_store;
pub mod ai_service;
pub mod file_storage;
pub mod version_control;
pub mod code_generator;
pub mod commands;
pub mod error;

// Re-export commonly used types
pub use error::{PageGenError, Result};
pub use models::{Project, Page, Version, CreateProjectRequest, UpdateProjectRequest};
pub use ai_service::{AiService, ApiProvider, Message, GenerateRequest};
pub use file_storage::FileStorage;
pub use commands::AppState;

use tauri::Manager;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let state = AppState::new(&app.handle());
            app.manage(state);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::create_project,
            commands::get_projects,
            commands::get_project,
            commands::update_project,
            commands::delete_project,
            commands::save_page_code,
            commands::save_version,
            commands::load_version,
            commands::get_app_dir,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

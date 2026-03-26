pub mod ai_service;
pub mod code_generator;
pub mod commands;
pub mod error;
pub mod exporter;
pub mod file_storage;
pub mod models;
pub mod project_store;
pub mod settings;
pub mod version_control;

// Re-export commonly used types
pub use ai_service::{AiService, ApiProvider, GenerateRequest, Message};
pub use commands::AppState;
pub use error::{PageGenError, Result};
pub use file_storage::FileStorage;
pub use models::{CreateProjectRequest, Page, Project, UpdateProjectRequest, Version};
pub use settings::{AppSettings, SettingsStorage};

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
            commands::generate_page,
            commands::save_page_code,
            commands::save_version,
            commands::load_version,
            commands::get_app_dir,
            commands::get_settings,
            commands::save_settings,
            commands::export_current_page,
            commands::export_project_files,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

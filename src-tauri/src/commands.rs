use crate::ai_service::{AiService, ApiProvider};
use crate::error::Result;
use crate::file_storage::FileStorage;
use crate::models::{CreateProjectRequest, Project, UpdateProjectRequest};
use crate::code_generator::generate_html_from_prompt;
use crate::exporter::{export_page_code, export_project};
use crate::settings::{AppSettings, SettingsStorage};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State};

// Application state
pub struct AppState {
    pub storage: Mutex<FileStorage>,
}

impl AppState {
    pub fn new(app_handle: &AppHandle) -> Self {
        let app_dir = app_handle
            .path()
            .app_data_dir()
            .expect("Failed to get app data dir")
            .join("projects");

        Self {
            storage: Mutex::new(FileStorage::new(app_dir)),
        }
    }
}

// Project Commands
#[tauri::command]
pub fn create_project(
    state: State<AppState>,
    request: CreateProjectRequest,
) -> Result<Project> {
    let storage = state.storage.lock().map_err(|_| crate::error::PageGenError::Io(
        "Failed to lock storage".to_string()
    ))?;

    let project = Project::new(request.name);
    storage.save_project(&project)?;
    Ok(project)
}

#[tauri::command]
pub fn get_projects(state: State<AppState>) -> Result<Vec<Project>> {
    let storage = state.storage.lock().map_err(|_| crate::error::PageGenError::Io(
        "Failed to lock storage".to_string()
    ))?;

    storage.load_all_projects()
}

#[tauri::command]
pub fn get_project(state: State<AppState>, id: String) -> Result<Project> {
    let storage = state.storage.lock().map_err(|_| crate::error::PageGenError::Io(
        "Failed to lock storage".to_string()
    ))?;

    storage.load_project(&id)
}

#[tauri::command]
pub fn update_project(
    state: State<AppState>,
    request: UpdateProjectRequest,
) -> Result<Project> {
    let storage = state.storage.lock().map_err(|_| crate::error::PageGenError::Io(
        "Failed to lock storage".to_string()
    ))?;

    let mut project = storage.load_project(&request.id)?;
    project.name = request.name;
    project.updated_at = chrono::Local::now();
    storage.save_project(&project)?;
    Ok(project)
}

#[tauri::command]
pub fn delete_project(state: State<AppState>, id: String) -> Result<()> {
    let storage = state.storage.lock().map_err(|_| crate::error::PageGenError::Io(
        "Failed to lock storage".to_string()
    ))?;

    storage.delete_project(&id)
}

// Page Commands
#[tauri::command]
pub fn save_page_code(
    state: State<AppState>,
    project_id: String,
    page_id: String,
    code: String,
) -> Result<()> {
    let storage = state.storage.lock().map_err(|_| crate::error::PageGenError::Io(
        "Failed to lock storage".to_string()
    ))?;

    let mut project = storage.load_project(&project_id)?;

    if let Some(page) = project.pages.iter_mut().find(|p| p.id == page_id) {
        page.current_code = code;
        project.updated_at = chrono::Local::now();
        storage.save_project(&project)?;
        Ok(())
    } else {
        Err(crate::error::PageGenError::ProjectNotFound { id: page_id })
    }
}

#[tauri::command]
pub async fn generate_page(
    app_handle: AppHandle,
    state: State<'_, AppState>,
    project_id: String,
    page_id: String,
    prompt: String,
) -> Result<Project> {
    let mut project = {
        let storage = state.storage.lock().map_err(|_| crate::error::PageGenError::Io(
            "Failed to lock storage".to_string()
        ))?;
        storage.load_project(&project_id)?
    };

    let settings = load_settings(&app_handle)?;

    if let Some(page) = project.pages.iter_mut().find(|p| p.id == page_id) {
        let existing_code = page.current_code.clone();
        let generated_code = if settings.api_key.trim().is_empty() {
            generate_html_from_prompt(&prompt, Some(&existing_code))
        } else {
            let provider = ApiProvider::try_from(settings.api_provider.as_str())?;
            let service = AiService::new(settings.api_key, settings.model, provider);
            service.generate_html(&prompt, Some(&existing_code)).await?
        };

        page.current_code = generated_code.clone();
        project.updated_at = chrono::Local::now();

        let version_id = uuid::Uuid::new_v4().to_string();

        let storage = state.storage.lock().map_err(|_| crate::error::PageGenError::Io(
            "Failed to lock storage".to_string()
        ))?;
        storage.save_project(&project)?;
        storage.save_version(&project_id, &version_id, &generated_code)?;

        Ok(project)
    } else {
        Err(crate::error::PageGenError::ProjectNotFound { id: page_id })
    }
}

// Version Commands
#[tauri::command]
pub fn save_version(
    state: State<AppState>,
    project_id: String,
    version_id: String,
    code: String,
) -> Result<()> {
    let storage = state.storage.lock().map_err(|_| crate::error::PageGenError::Io(
        "Failed to lock storage".to_string()
    ))?;

    storage.save_version(&project_id, &version_id, &code)
}

#[tauri::command]
pub fn load_version(
    state: State<AppState>,
    project_id: String,
    version_id: String,
) -> Result<String> {
    let storage = state.storage.lock().map_err(|_| crate::error::PageGenError::Io(
        "Failed to lock storage".to_string()
    ))?;

    storage.load_version(&project_id, &version_id)
}

// Settings Commands
#[tauri::command]
pub fn get_app_dir(app_handle: AppHandle) -> Result<String> {
    let path = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::PageGenError::Io(e.to_string()))?;

    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn get_settings(app_handle: AppHandle) -> Result<AppSettings> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::PageGenError::Io(e.to_string()))?;

    SettingsStorage::new(app_dir.join("settings.json")).load()
}

#[tauri::command]
pub fn save_settings(app_handle: AppHandle, settings: AppSettings) -> Result<AppSettings> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::PageGenError::Io(e.to_string()))?;

    SettingsStorage::new(app_dir.join("settings.json")).save(&settings)
}

#[tauri::command]
pub fn export_current_page(
    state: State<AppState>,
    project_id: String,
    page_id: String,
    export_path: String,
) -> Result<String> {
    let storage = state.storage.lock().map_err(|_| crate::error::PageGenError::Io(
        "Failed to lock storage".to_string()
    ))?;

    let project = storage.load_project(&project_id)?;
    let page = project
        .pages
        .iter()
        .find(|page| page.id == page_id)
        .ok_or(crate::error::PageGenError::ProjectNotFound { id: page_id })?;

    export_page_code(&page.current_code, &export_path)
}

#[tauri::command]
pub fn export_project_files(
    state: State<AppState>,
    project_id: String,
    export_dir: String,
) -> Result<String> {
    let storage = state.storage.lock().map_err(|_| crate::error::PageGenError::Io(
        "Failed to lock storage".to_string()
    ))?;

    let project = storage.load_project(&project_id)?;
    export_project(&project, &export_dir)
}

fn load_settings(app_handle: &AppHandle) -> Result<AppSettings> {
    let app_dir = app_handle
        .path()
        .app_data_dir()
        .map_err(|e| crate::error::PageGenError::Io(e.to_string()))?;

    SettingsStorage::new(app_dir.join("settings.json")).load()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_state() -> (AppState, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let storage = FileStorage::new(temp_dir.path().to_path_buf());

        let state = AppState {
            storage: Mutex::new(storage),
        };

        (state, temp_dir)
    }

    #[test]
    fn test_app_state_creates_storage() {
        let temp_dir = TempDir::new().unwrap();
        let storage = FileStorage::new(temp_dir.path().to_path_buf());

        let state = AppState {
            storage: Mutex::new(storage),
        };

        // Verify storage is accessible
        let guard = state.storage.lock().unwrap();
        let projects = guard.load_all_projects().unwrap();
        assert!(projects.is_empty());
    }
}

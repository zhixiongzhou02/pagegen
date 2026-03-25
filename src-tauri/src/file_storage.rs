use crate::error::{PageGenError, Result};
use crate::models::{Project, Page};
use std::fs;
use std::path::PathBuf;

pub struct FileStorage {
    base_path: PathBuf,
}

impl FileStorage {
    pub fn new(base_path: PathBuf) -> Self {
        Self { base_path }
    }

    /// Save a project to disk
    pub fn save_project(&self, project: &Project) -> Result<()> {
        let project_path = self.base_path.join(&project.id);
        fs::create_dir_all(&project_path)?;

        // Save project metadata
        let metadata_path = project_path.join("project.json");
        let metadata = serde_json::to_string_pretty(project)?;
        fs::write(&metadata_path, metadata)?;

        // Save each page as HTML file
        for page in &project.pages {
            let page_path = project_path.join(&page.path);
            fs::write(&page_path, &page.current_code)?;
        }

        Ok(())
    }

    /// Load a project from disk
    pub fn load_project(&self, project_id: &str) -> Result<Project> {
        let project_path = self.base_path.join(project_id);
        let metadata_path = project_path.join("project.json");

        if !metadata_path.exists() {
            return Err(PageGenError::ProjectNotFound {
                id: project_id.to_string(),
            });
        }

        let metadata = fs::read_to_string(&metadata_path)?;
        let mut project: Project = serde_json::from_str(&metadata)?;

        // Load current code for each page from HTML files
        for page in &mut project.pages {
            let page_path = project_path.join(&page.path);
            if page_path.exists() {
                page.current_code = fs::read_to_string(&page_path)?;
            }
        }

        Ok(project)
    }

    /// Load all projects from disk
    pub fn load_all_projects(&self) -> Result<Vec<Project>> {
        if !self.base_path.exists() {
            return Ok(Vec::new());
        }

        let mut projects = Vec::new();

        for entry in fs::read_dir(&self.base_path)? {
            let entry = entry?;
            if entry.file_type()?.is_dir() {
                let project_id = entry.file_name().to_string_lossy().to_string();
                if let Ok(project) = self.load_project(&project_id) {
                    projects.push(project);
                }
            }
        }

        // Sort by creation date
        projects.sort_by(|a, b| a.created_at.cmp(&b.created_at));

        Ok(projects)
    }

    /// Delete a project from disk
    pub fn delete_project(&self, project_id: &str) -> Result<()> {
        let project_path = self.base_path.join(project_id);

        if !project_path.exists() {
            return Err(PageGenError::ProjectNotFound {
                id: project_id.to_string(),
            });
        }

        fs::remove_dir_all(&project_path)?;
        Ok(())
    }

    /// Save a version snapshot
    pub fn save_version(&self, project_id: &str, version_id: &str, code: &str) -> Result<()> {
        let versions_path = self.base_path.join(project_id).join(".versions").join(version_id);
        fs::create_dir_all(&versions_path)?;

        let snapshot_path = versions_path.join("index.html");
        fs::write(&snapshot_path, code)?;

        Ok(())
    }

    /// Load a version snapshot
    pub fn load_version(&self, project_id: &str, version_id: &str) -> Result<String> {
        let snapshot_path = self
            .base_path
            .join(project_id)
            .join(".versions")
            .join(version_id)
            .join("index.html");

        if !snapshot_path.exists() {
            return Err(PageGenError::VersionNotFound {
                id: version_id.to_string(),
            });
        }

        Ok(fs::read_to_string(&snapshot_path)?)
    }

    /// Get storage directory path for a project
    pub fn get_project_path(&self, project_id: &str) -> PathBuf {
        self.base_path.join(project_id)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_storage() -> (FileStorage, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let storage = FileStorage::new(temp_dir.path().to_path_buf());
        (storage, temp_dir)
    }

    fn create_test_project(id: &str, name: &str) -> Project {
        Project {
            id: id.to_string(),
            name: name.to_string(),
            created_at: chrono::Local::now(),
            updated_at: chrono::Local::now(),
            pages: vec![Page {
                id: "page1".to_string(),
                name: "index".to_string(),
                path: "index.html".to_string(),
                current_code: "<html><body>Hello</body></html>".to_string(),
                versions: vec![],
            }],
        }
    }

    #[test]
    fn test_save_project_creates_directory_and_files() {
        let (storage, _temp) = create_test_storage();
        let project = create_test_project("test-123", "Test Project");

        storage.save_project(&project).unwrap();

        let project_path = storage.get_project_path("test-123");
        assert!(project_path.exists());
        assert!(project_path.join("project.json").exists());
        assert!(project_path.join("index.html").exists());
    }

    #[test]
    fn test_load_project_returns_correct_data() {
        let (storage, _temp) = create_test_storage();
        let project = create_test_project("test-456", "My Project");
        storage.save_project(&project).unwrap();

        let loaded = storage.load_project("test-456").unwrap();

        assert_eq!(loaded.id, "test-456");
        assert_eq!(loaded.name, "My Project");
        assert_eq!(loaded.pages.len(), 1);
        assert_eq!(loaded.pages[0].current_code, "<html><body>Hello</body></html>");
    }

    #[test]
    fn test_load_nonexistent_project_fails() {
        let (storage, _temp) = create_test_storage();

        let result = storage.load_project("nonexistent");

        assert!(result.is_err());
        match result {
            Err(PageGenError::ProjectNotFound { id }) => assert_eq!(id, "nonexistent"),
            _ => panic!("Expected ProjectNotFound error"),
        }
    }

    #[test]
    fn test_load_all_projects_returns_empty_when_no_projects() {
        let (storage, _temp) = create_test_storage();

        let projects = storage.load_all_projects().unwrap();

        assert!(projects.is_empty());
    }

    #[test]
    fn test_load_all_projects_returns_saved_projects() {
        let (storage, _temp) = create_test_storage();
        let project1 = create_test_project("proj-1", "Project 1");
        let project2 = create_test_project("proj-2", "Project 2");

        storage.save_project(&project1).unwrap();
        storage.save_project(&project2).unwrap();

        let projects = storage.load_all_projects().unwrap();

        assert_eq!(projects.len(), 2);
        assert!(projects.iter().any(|p| p.name == "Project 1"));
        assert!(projects.iter().any(|p| p.name == "Project 2"));
    }

    #[test]
    fn test_delete_project_removes_files() {
        let (storage, _temp) = create_test_storage();
        let project = create_test_project("to-delete", "To Delete");
        storage.save_project(&project).unwrap();

        storage.delete_project("to-delete").unwrap();

        assert!(!storage.get_project_path("to-delete").exists());
    }

    #[test]
    fn test_delete_nonexistent_project_fails() {
        let (storage, _temp) = create_test_storage();

        let result = storage.delete_project("nonexistent");

        assert!(result.is_err());
    }

    #[test]
    fn test_save_and_load_version_snapshot() {
        let (storage, _temp) = create_test_storage();
        let project = create_test_project("version-test", "Version Test");
        storage.save_project(&project).unwrap();

        let version_code = "<html><body>Version 1</body></html>";
        storage.save_version("version-test", "v1", version_code).unwrap();

        let loaded = storage.load_version("version-test", "v1").unwrap();
        assert_eq!(loaded, version_code);
    }

    #[test]
    fn test_load_nonexistent_version_fails() {
        let (storage, _temp) = create_test_storage();
        let project = create_test_project("version-test", "Version Test");
        storage.save_project(&project).unwrap();

        let result = storage.load_version("version-test", "nonexistent");

        assert!(result.is_err());
        match result {
            Err(PageGenError::VersionNotFound { id }) => assert_eq!(id, "nonexistent"),
            _ => panic!("Expected VersionNotFound error"),
        }
    }

    #[test]
    fn test_save_project_updates_existing_project() {
        let (storage, _temp) = create_test_storage();
        let mut project = create_test_project("update-test", "Original Name");
        storage.save_project(&project).unwrap();

        project.name = "Updated Name".to_string();
        project.pages[0].current_code = "<html><body>Updated</body></html>".to_string();
        storage.save_project(&project).unwrap();

        let loaded = storage.load_project("update-test").unwrap();
        assert_eq!(loaded.name, "Updated Name");
        assert_eq!(loaded.pages[0].current_code, "<html><body>Updated</body></html>");
    }

    #[test]
    fn test_save_project_with_multiple_pages() {
        let (storage, _temp) = create_test_storage();
        let mut project = create_test_project("multi-page", "Multi Page");
        project.pages.push(Page {
            id: "page2".to_string(),
            name: "about".to_string(),
            path: "about.html".to_string(),
            current_code: "<html><body>About</body></html>".to_string(),
            versions: vec![],
        });

        storage.save_project(&project).unwrap();

        let loaded = storage.load_project("multi-page").unwrap();
        assert_eq!(loaded.pages.len(), 2);
        assert!(storage.get_project_path("multi-page").join("about.html").exists());
    }

    #[test]
    fn test_load_all_projects_skips_invalid_directories() {
        let (storage, _temp) = create_test_storage();

        // Create an empty directory (invalid project)
        fs::create_dir_all(storage.get_project_path("invalid-project")).unwrap();

        // Create a valid project
        let project = create_test_project("valid-project", "Valid Project");
        storage.save_project(&project).unwrap();

        let projects = storage.load_all_projects().unwrap();

        // Should only return the valid project
        assert_eq!(projects.len(), 1);
        assert_eq!(projects[0].id, "valid-project");
    }
}

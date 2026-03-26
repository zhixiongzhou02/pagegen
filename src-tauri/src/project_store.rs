use crate::error::{PageGenError, Result};
use crate::models::{CreateProjectRequest, Project, UpdateProjectRequest};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

pub struct ProjectStore {
    projects: Mutex<HashMap<String, Project>>,
    base_path: PathBuf,
}

impl ProjectStore {
    pub fn new(base_path: PathBuf) -> Self {
        Self {
            projects: Mutex::new(HashMap::new()),
            base_path,
        }
    }

    pub fn create(&self, request: CreateProjectRequest) -> Result<Project> {
        Self::validate_project_name(&request.name)?;

        let project = Project::new(request.name);
        let mut projects = self.projects.lock().unwrap();
        projects.insert(project.id.clone(), project.clone());

        Ok(project)
    }

    pub fn get_all(&self) -> Result<Vec<Project>> {
        let projects = self.projects.lock().unwrap();
        let mut result: Vec<Project> = projects.values().cloned().collect();
        result.sort_by(|a, b| a.created_at.cmp(&b.created_at));
        Ok(result)
    }

    pub fn get(&self, id: &str) -> Result<Project> {
        let projects = self.projects.lock().unwrap();
        projects
            .get(id)
            .cloned()
            .ok_or_else(|| PageGenError::ProjectNotFound { id: id.to_string() })
    }

    pub fn update(&self, request: UpdateProjectRequest) -> Result<Project> {
        Self::validate_project_name(&request.name)?;

        let mut projects = self.projects.lock().unwrap();
        let project =
            projects
                .get_mut(&request.id)
                .ok_or_else(|| PageGenError::ProjectNotFound {
                    id: request.id.clone(),
                })?;

        project.name = request.name;
        project.updated_at = chrono::Local::now();

        Ok(project.clone())
    }

    pub fn delete(&self, id: &str) -> Result<()> {
        let mut projects = self.projects.lock().unwrap();
        if projects.remove(id).is_none() {
            return Err(PageGenError::ProjectNotFound { id: id.to_string() });
        }
        Ok(())
    }

    fn validate_project_name(name: &str) -> Result<()> {
        if name.trim().is_empty() {
            return Err(PageGenError::InvalidProjectName {
                reason: "Project name cannot be empty".to_string(),
            });
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_test_store() -> (ProjectStore, TempDir) {
        let temp_dir = TempDir::new().unwrap();
        let store = ProjectStore::new(temp_dir.path().to_path_buf());
        (store, temp_dir)
    }

    #[test]
    fn test_create_project_success() {
        let (store, _temp) = create_test_store();

        let request = CreateProjectRequest {
            name: "My Project".to_string(),
        };

        let project = store.create(request).unwrap();

        assert_eq!(project.name, "My Project");
        assert!(!project.id.is_empty());
        assert_eq!(project.pages.len(), 1);
    }

    #[test]
    fn test_create_project_with_empty_name_fails() {
        let (store, _temp) = create_test_store();

        let request = CreateProjectRequest {
            name: "".to_string(),
        };

        let result = store.create(request);

        assert!(result.is_err());
    }

    #[test]
    fn test_get_all_projects_returns_empty_list_initially() {
        let (store, _temp) = create_test_store();

        let projects = store.get_all().unwrap();

        assert!(projects.is_empty());
    }

    #[test]
    fn test_get_all_returns_created_projects() {
        let (store, _temp) = create_test_store();

        store
            .create(CreateProjectRequest {
                name: "Project 1".to_string(),
            })
            .unwrap();

        store
            .create(CreateProjectRequest {
                name: "Project 2".to_string(),
            })
            .unwrap();

        let projects = store.get_all().unwrap();

        assert_eq!(projects.len(), 2);
    }

    #[test]
    fn test_get_project_by_id() {
        let (store, _temp) = create_test_store();

        let created = store
            .create(CreateProjectRequest {
                name: "Test Project".to_string(),
            })
            .unwrap();

        let fetched = store.get(&created.id).unwrap();

        assert_eq!(fetched.id, created.id);
        assert_eq!(fetched.name, "Test Project");
    }

    #[test]
    fn test_get_nonexistent_project_fails() {
        let (store, _temp) = create_test_store();

        let result = store.get("nonexistent-id");

        assert!(result.is_err());
    }

    #[test]
    fn test_update_project_name() {
        let (store, _temp) = create_test_store();

        let created = store
            .create(CreateProjectRequest {
                name: "Old Name".to_string(),
            })
            .unwrap();

        let updated = store
            .update(UpdateProjectRequest {
                id: created.id.clone(),
                name: "New Name".to_string(),
            })
            .unwrap();

        assert_eq!(updated.name, "New Name");
        assert!(updated.updated_at > created.updated_at);
    }

    #[test]
    fn test_delete_project() {
        let (store, _temp) = create_test_store();

        let created = store
            .create(CreateProjectRequest {
                name: "To Delete".to_string(),
            })
            .unwrap();

        store.delete(&created.id).unwrap();

        let result = store.get(&created.id);
        assert!(result.is_err());
    }
}

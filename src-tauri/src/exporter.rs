use crate::error::{PageGenError, Result};
use crate::models::Project;
use std::fs;
use std::path::{Path, PathBuf};

fn validate_export_path(export_path: &str) -> Result<PathBuf> {
    let trimmed = export_path.trim();
    if trimmed.is_empty() {
        return Err(PageGenError::InvalidExportPath {
            reason: "Export path cannot be empty".to_string(),
        });
    }

    Ok(PathBuf::from(trimmed))
}

pub fn export_page_code(code: &str, export_path: &str) -> Result<String> {
    let path = validate_export_path(export_path)?;

    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    fs::write(&path, code)?;
    Ok(path.to_string_lossy().to_string())
}

pub fn export_project(project: &Project, export_dir: &str) -> Result<String> {
    let root = validate_export_path(export_dir)?;
    let project_dir = root.join(sanitize_name(&project.name));
    fs::create_dir_all(&project_dir)?;

    for page in &project.pages {
        let page_path = project_dir.join(&page.path);
        if let Some(parent) = page_path.parent() {
            fs::create_dir_all(parent)?;
        }
        fs::write(page_path, &page.current_code)?;
    }

    Ok(project_dir.to_string_lossy().to_string())
}

fn sanitize_name(name: &str) -> String {
    let sanitized = name
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '-',
            _ => c,
        })
        .collect::<String>()
        .trim()
        .to_string();

    if sanitized.is_empty() {
        "pagegen-export".to_string()
    } else {
        sanitized
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::models::{Page, Project};
    use chrono::Local;
    use tempfile::TempDir;

    fn sample_project() -> Project {
        Project {
            id: "project-1".to_string(),
            name: "Landing Project".to_string(),
            created_at: Local::now(),
            updated_at: Local::now(),
            pages: vec![
                Page {
                    id: "page-1".to_string(),
                    name: "index".to_string(),
                    path: "index.html".to_string(),
                    current_code: "<html>Home</html>".to_string(),
                    versions: vec![],
                },
                Page {
                    id: "page-2".to_string(),
                    name: "about".to_string(),
                    path: "about/team.html".to_string(),
                    current_code: "<html>About</html>".to_string(),
                    versions: vec![],
                },
            ],
        }
    }

    #[test]
    fn test_export_page_code_writes_file() {
        let temp_dir = TempDir::new().unwrap();
        let path = temp_dir.path().join("output").join("index.html");

        let exported = export_page_code("<html>Hello</html>", path.to_str().unwrap()).unwrap();

        assert_eq!(exported, path.to_string_lossy().to_string());
        assert_eq!(fs::read_to_string(path).unwrap(), "<html>Hello</html>");
    }

    #[test]
    fn test_export_project_writes_all_pages() {
        let temp_dir = TempDir::new().unwrap();
        let exported_dir = export_project(&sample_project(), temp_dir.path().to_str().unwrap()).unwrap();
        let exported_path = Path::new(&exported_dir);

        assert!(exported_path.join("index.html").exists());
        assert!(exported_path.join("about/team.html").exists());
    }

    #[test]
    fn test_export_path_cannot_be_empty() {
        let result = export_page_code("<html>Hello</html>", "   ");

        assert!(matches!(result, Err(PageGenError::InvalidExportPath { .. })));
    }
}

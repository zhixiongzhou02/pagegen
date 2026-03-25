use serde::{Deserialize, Serialize};
use chrono::{DateTime, Local};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Project {
    pub id: String,
    pub name: String,
    pub created_at: DateTime<Local>,
    pub updated_at: DateTime<Local>,
    pub pages: Vec<Page>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Page {
    pub id: String,
    pub name: String,
    pub path: String,
    pub current_code: String,
    pub versions: Vec<Version>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Version {
    pub id: String,
    pub message: String,
    pub timestamp: DateTime<Local>,
    pub code_snapshot: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateProjectRequest {
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateProjectRequest {
    pub id: String,
    pub name: String,
}

impl Project {
    pub fn new(name: String) -> Self {
        let now = Local::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name,
            created_at: now,
            updated_at: now,
            pages: vec![Page::default_index()],
        }
    }
}

impl Page {
    pub fn default_index() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: "index".to_string(),
            path: "index.html".to_string(),
            current_code: String::new(),
            versions: Vec::new(),
        }
    }
}

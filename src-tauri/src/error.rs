use thiserror::Error;
use serde::Serialize;

#[derive(Error, Debug, Serialize)]
#[serde(tag = "type", content = "message")]
pub enum PageGenError {
    #[error("IO error: {0}")]
    Io(String),

    #[error("Serialization error: {0}")]
    Serialization(String),

    #[error("Project not found: {id}")]
    ProjectNotFound { id: String },

    #[error("Invalid project name: {reason}")]
    InvalidProjectName { reason: String },

    #[error("API error: {message}")]
    ApiError { message: String },

    #[error("Version not found: {id}")]
    VersionNotFound { id: String },

    #[error("Invalid API key: {reason}")]
    InvalidApiKey { reason: String },

    #[error("Invalid export path: {reason}")]
    InvalidExportPath { reason: String },

    #[error("Not implemented")]
    NotImplemented,
}

impl From<std::io::Error> for PageGenError {
    fn from(e: std::io::Error) -> Self {
        PageGenError::Io(e.to_string())
    }
}

impl From<serde_json::Error> for PageGenError {
    fn from(e: serde_json::Error) -> Self {
        PageGenError::Serialization(e.to_string())
    }
}

pub type Result<T> = std::result::Result<T, PageGenError>;

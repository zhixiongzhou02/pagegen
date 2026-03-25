use crate::error::Result;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct AppSettings {
    pub api_provider: String,
    pub api_key: String,
    pub model: String,
    pub theme: String,
    pub default_export_path: Option<String>,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            api_provider: "claude".to_string(),
            api_key: String::new(),
            model: "claude-sonnet-4-20250514".to_string(),
            theme: "system".to_string(),
            default_export_path: None,
        }
    }
}

pub struct SettingsStorage {
    path: PathBuf,
}

impl SettingsStorage {
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    pub fn load(&self) -> Result<AppSettings> {
        if !self.path.exists() {
            return Ok(AppSettings::default());
        }

        let content = fs::read_to_string(&self.path)?;
        Ok(serde_json::from_str(&content)?)
    }

    pub fn save(&self, settings: &AppSettings) -> Result<AppSettings> {
        if let Some(parent) = self.path.parent() {
            fs::create_dir_all(parent)?;
        }

        let content = serde_json::to_string_pretty(settings)?;
        fs::write(&self.path, content)?;
        Ok(settings.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    fn create_storage() -> (SettingsStorage, TempDir) {
      let temp_dir = TempDir::new().unwrap();
      let path = temp_dir.path().join("settings.json");
      (SettingsStorage::new(path), temp_dir)
    }

    #[test]
    fn test_load_returns_defaults_when_file_missing() {
        let (storage, _temp_dir) = create_storage();

        let settings = storage.load().unwrap();

        assert_eq!(settings, AppSettings::default());
    }

    #[test]
    fn test_save_and_load_settings() {
        let (storage, _temp_dir) = create_storage();
        let settings = AppSettings {
            api_provider: "openai".to_string(),
            api_key: "sk-test".to_string(),
            model: "gpt-4".to_string(),
            theme: "dark".to_string(),
            default_export_path: Some("/tmp/export".to_string()),
        };

        storage.save(&settings).unwrap();
        let loaded = storage.load().unwrap();

        assert_eq!(loaded, settings);
    }
}

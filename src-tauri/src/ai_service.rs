use crate::error::{PageGenError, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone)]
pub struct AiService {
    api_key: String,
    model: String,
    provider: ApiProvider,
    #[allow(dead_code)]
    client: Client,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ApiProvider {
    Claude,
    OpenAi,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Message {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Clone)]
pub struct GenerateRequest {
    pub messages: Vec<Message>,
    pub system_prompt: Option<String>,
}

impl AiService {
    pub fn new(api_key: String, model: String, provider: ApiProvider) -> Self {
        Self {
            api_key,
            model,
            provider,
            client: Client::new(),
        }
    }

    pub fn validate_api_key(&self) -> Result<()> {
        if self.api_key.trim().is_empty() {
            return Err(PageGenError::InvalidApiKey {
                reason: "API key cannot be empty".to_string(),
            });
        }
        Ok(())
    }

    pub fn build_prompt(&self, user_input: &str, context: Option<&str>) -> GenerateRequest {
        let system_prompt = Some(format!(
            "You are a professional front-end developer and UI designer. \
            Generate high-quality HTML/CSS/JavaScript code based on user requirements. \
            Use semantic HTML5, modern CSS (Flexbox/Grid), and responsive design. \
            Output ONLY the complete HTML code wrapped in ```html ... ``` blocks."
        ));

        let content = match context {
            Some(ctx) => format!("{}\n\nPrevious context:\n{}", user_input, ctx),
            None => user_input.to_string(),
        };

        GenerateRequest {
            messages: vec![Message {
                role: "user".to_string(),
                content,
            }],
            system_prompt,
        }
    }

    pub fn extract_code_from_stream_chunk(chunk: &str) -> Option<String> {
        // Handle SSE format from Claude API
        if chunk.starts_with("data: ") {
            let json_str = &chunk[6..]; // Remove "data: " prefix
            if json_str == "[DONE]" {
                return None;
            }

            // Parse the JSON to extract content
            if let Ok(json) = serde_json::from_str::<serde_json::Value>(json_str) {
                if let Some(content) = json.get("delta").and_then(|d| d.get("text")).and_then(|t| t.as_str()) {
                    return Some(content.to_string());
                }
            }
        }
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_service() -> AiService {
        AiService::new(
            "test-api-key".to_string(),
            "claude-3-5-sonnet-20241022".to_string(),
            ApiProvider::Claude,
        )
    }

    #[test]
    fn test_new_service_stores_api_key_and_model() {
        let service = create_test_service();

        assert_eq!(service.api_key, "test-api-key");
        assert_eq!(service.model, "claude-3-5-sonnet-20241022");
        assert_eq!(service.provider, ApiProvider::Claude);
    }

    #[test]
    fn test_validate_api_key_with_valid_key_succeeds() {
        let service = create_test_service();

        let result = service.validate_api_key();

        assert!(result.is_ok());
    }

    #[test]
    fn test_validate_api_key_with_empty_key_fails() {
        let service = AiService::new(
            "".to_string(),
            "claude-3-5-sonnet-20241022".to_string(),
            ApiProvider::Claude,
        );

        let result = service.validate_api_key();

        assert!(result.is_err());
        match result {
            Err(PageGenError::InvalidApiKey { .. }) => (), // Expected
            _ => panic!("Expected InvalidApiKey error"),
        }
    }

    #[test]
    fn test_validate_api_key_with_whitespace_only_fails() {
        let service = AiService::new(
            "   ".to_string(),
            "claude-3-5-sonnet-20241022".to_string(),
            ApiProvider::Claude,
        );

        let result = service.validate_api_key();

        assert!(result.is_err());
    }

    #[test]
    fn test_build_prompt_creates_request_with_system_prompt() {
        let service = create_test_service();

        let request = service.build_prompt("Create a landing page", None);

        assert!(request.system_prompt.is_some());
        assert!(request.system_prompt.unwrap().contains("front-end developer"));
        assert_eq!(request.messages.len(), 1);
        assert_eq!(request.messages[0].role, "user");
        assert_eq!(request.messages[0].content, "Create a landing page");
    }

    #[test]
    fn test_build_prompt_includes_context_when_provided() {
        let service = create_test_service();

        let request = service.build_prompt("Make it blue", Some("Previous HTML code..."));

        assert!(request.messages[0].content.contains("Previous context:"));
        assert!(request.messages[0].content.contains("Previous HTML code..."));
    }

    #[test]
    fn test_extract_code_from_stream_chunk_with_valid_sse() {
        let chunk = r#"data: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": "<div>"}}"#;

        let result = AiService::extract_code_from_stream_chunk(chunk);

        assert_eq!(result, Some("<div>".to_string()));
    }

    #[test]
    fn test_extract_code_from_stream_chunk_with_done_signal() {
        let chunk = "data: [DONE]";

        let result = AiService::extract_code_from_stream_chunk(chunk);

        assert_eq!(result, None);
    }

    #[test]
    fn test_extract_code_from_stream_chunk_with_invalid_format() {
        let chunk = "not a valid sse format";

        let result = AiService::extract_code_from_stream_chunk(chunk);

        assert_eq!(result, None);
    }

    #[test]
    fn test_extract_code_from_stream_chunk_with_empty_content() {
        let chunk = r#"data: {"type": "content_block_delta", "delta": {"type": "text_delta", "text": ""}}"#;

        let result = AiService::extract_code_from_stream_chunk(chunk);

        assert_eq!(result, Some("".to_string()));
    }

    #[test]
    fn test_message_struct_serialization() {
        let message = Message {
            role: "user".to_string(),
            content: "Hello".to_string(),
        };

        let json = serde_json::to_string(&message).unwrap();

        assert!(json.contains("\"role\":\"user\""));
        assert!(json.contains("\"content\":\"Hello\""));
    }
}

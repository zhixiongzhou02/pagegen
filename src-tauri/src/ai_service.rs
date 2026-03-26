use crate::code_generator::extract_html_code;
use crate::error::{PageGenError, Result};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::time::Duration;

const OPENAI_API_URL: &str = "http://137.220.63.236:8084/v1/responses";
const ANTHROPIC_API_URL: &str = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_API_VERSION: &str = "2023-06-01";
const DEFAULT_MAX_OUTPUT_TOKENS: u32 = 1800;
const REQUEST_TIMEOUT_SECONDS: u64 = 180;
const MAX_CONTEXT_CHARS: usize = 2500;

#[derive(Debug, Clone)]
pub struct AiService {
    api_key: String,
    model: String,
    provider: ApiProvider,
    client: Client,
}

#[derive(Debug, Clone, PartialEq)]
pub enum ApiProvider {
    Claude,
    OpenAi,
}

impl TryFrom<&str> for ApiProvider {
    type Error = PageGenError;

    fn try_from(value: &str) -> Result<Self> {
        match value.trim().to_lowercase().as_str() {
            "claude" => Ok(Self::Claude),
            "openai" => Ok(Self::OpenAi),
            other => Err(PageGenError::ApiError {
                message: format!("Unsupported API provider: {other}"),
            }),
        }
    }
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
        let client = Client::builder()
            .timeout(Duration::from_secs(REQUEST_TIMEOUT_SECONDS))
            .build()
            .unwrap_or_else(|_| Client::new());

        Self {
            api_key,
            model,
            provider,
            client,
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
        let system_prompt = Some(
            "You are a senior front-end engineer and product designer. \
            Generate a complete, production-style single HTML file based on the user's request. \
            Requirements: semantic HTML5, responsive CSS, polished visual hierarchy, accessible markup, \
            and inline CSS/JS only when needed. Return only the final HTML inside a ```html code block."
                .to_string(),
        );

        let content = match context {
            Some(ctx) if !ctx.trim().is_empty() => {
                let truncated = truncate_context(ctx, MAX_CONTEXT_CHARS);
                format!(
                    "{user_input}\n\nCurrent page HTML to improve or replace:\n```html\n{truncated}\n```"
                )
            }
            _ => user_input.to_string(),
        };

        GenerateRequest {
            messages: vec![Message {
                role: "user".to_string(),
                content,
            }],
            system_prompt,
        }
    }

    pub async fn generate_html(&self, user_input: &str, context: Option<&str>) -> Result<String> {
        self.validate_api_key()?;

        let primary_request = self.build_prompt(user_input, context);

        match self.generate_html_from_request(&primary_request).await {
            Ok(html) => Ok(html),
            Err(primary_error) => {
                if context.is_none() {
                    return Err(primary_error);
                }

                let fallback_request = self.build_prompt(user_input, None);
                self.generate_html_from_request(&fallback_request)
                    .await
                    .map_err(|fallback_error| PageGenError::ApiError {
                        message: format!(
                            "Primary generation failed: {}. Fallback generation failed: {}",
                            primary_error, fallback_error
                        ),
                    })
            }
        }
    }

    async fn generate_html_from_request(&self, request: &GenerateRequest) -> Result<String> {
        let response_text = match self.provider {
            ApiProvider::Claude => self.generate_with_claude(request).await?,
            ApiProvider::OpenAi => self.generate_with_openai(request).await?,
        };

        extract_html_code(&response_text)
            .or_else(|| extract_html_document(&response_text))
            .ok_or(PageGenError::ApiError {
                message: "Model response did not contain a valid HTML document".to_string(),
            })
    }

    async fn generate_with_openai(&self, request: &GenerateRequest) -> Result<String> {
        let input = request
            .messages
            .iter()
            .map(|message| {
                json!({
                    "role": message.role,
                    "content": [
                        {
                            "type": "input_text",
                            "text": message.content
                        }
                    ]
                })
            })
            .collect::<Vec<_>>();

        let body = json!({
            "model": self.model,
            "instructions": request.system_prompt,
            "input": input,
            "max_output_tokens": DEFAULT_MAX_OUTPUT_TOKENS,
        });

        let response = self
            .client
            .post(OPENAI_API_URL)
            .bearer_auth(&self.api_key)
            .header("Content-Type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|error| PageGenError::ApiError {
                message: format!("OpenAI request failed: {error}"),
            })?;

        let status = response.status();
        let payload: Value = response
            .json()
            .await
            .map_err(|error| PageGenError::ApiError {
                message: format!("OpenAI response parsing failed: {error}"),
            })?;

        if !status.is_success() {
            return Err(PageGenError::ApiError {
                message: extract_api_error_message(&payload)
                    .unwrap_or_else(|| format!("OpenAI API returned HTTP {status}")),
            });
        }

        extract_openai_text(&payload).ok_or(PageGenError::ApiError {
            message: "OpenAI response did not contain text output".to_string(),
        })
    }

    async fn generate_with_claude(&self, request: &GenerateRequest) -> Result<String> {
        let messages = request
            .messages
            .iter()
            .map(|message| {
                json!({
                    "role": message.role,
                    "content": message.content
                })
            })
            .collect::<Vec<_>>();

        let body = json!({
            "model": self.model,
            "max_tokens": DEFAULT_MAX_OUTPUT_TOKENS,
            "system": request.system_prompt,
            "messages": messages,
        });

        let response = self
            .client
            .post(ANTHROPIC_API_URL)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", ANTHROPIC_API_VERSION)
            .header("content-type", "application/json")
            .json(&body)
            .send()
            .await
            .map_err(|error| PageGenError::ApiError {
                message: format!("Claude request failed: {error}"),
            })?;

        let status = response.status();
        let payload: Value = response
            .json()
            .await
            .map_err(|error| PageGenError::ApiError {
                message: format!("Claude response parsing failed: {error}"),
            })?;

        if !status.is_success() {
            return Err(PageGenError::ApiError {
                message: extract_api_error_message(&payload)
                    .unwrap_or_else(|| format!("Claude API returned HTTP {status}")),
            });
        }

        extract_claude_text(&payload).ok_or(PageGenError::ApiError {
            message: "Claude response did not contain text output".to_string(),
        })
    }
}

fn truncate_context(input: &str, max_chars: usize) -> String {
    let total_chars = input.chars().count();
    if total_chars <= max_chars {
        return input.to_string();
    }

    let truncated: String = input.chars().take(max_chars).collect();
    format!(
        "{truncated}\n\n<!-- Context truncated from {total_chars} chars to {max_chars} chars for faster generation. -->"
    )
}

fn extract_openai_text(payload: &Value) -> Option<String> {
    if let Some(text) = payload.get("output_text").and_then(Value::as_str) {
        return Some(text.to_string());
    }

    payload
        .get("output")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .find_map(|item| {
            item.get("content")
                .and_then(Value::as_array)
                .into_iter()
                .flatten()
                .find_map(|content| {
                    content
                        .get("text")
                        .and_then(Value::as_str)
                        .map(|text| text.to_string())
                })
        })
}

fn extract_claude_text(payload: &Value) -> Option<String> {
    payload
        .get("content")
        .and_then(Value::as_array)
        .into_iter()
        .flatten()
        .find_map(|item| {
            item.get("text")
                .and_then(Value::as_str)
                .map(|text| text.to_string())
        })
}

fn extract_api_error_message(payload: &Value) -> Option<String> {
    payload
        .get("error")
        .and_then(|value| value.get("message").or(Some(value)))
        .and_then(Value::as_str)
        .map(|message| message.to_string())
}

fn extract_html_document(response: &str) -> Option<String> {
    let lower = response.to_lowercase();
    let start = lower
        .find("<!doctype html")
        .or_else(|| lower.find("<html"))?;
    let end = lower.rfind("</html>")?;
    Some(response[start..end + "</html>".len()].trim().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_service() -> AiService {
        AiService::new(
            "test-api-key".to_string(),
            "claude-sonnet-4-20250514".to_string(),
            ApiProvider::Claude,
        )
    }

    #[test]
    fn test_new_service_stores_api_key_and_model() {
        let service = create_test_service();

        assert_eq!(service.api_key, "test-api-key");
        assert_eq!(service.model, "claude-sonnet-4-20250514");
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
            "claude-sonnet-4-20250514".to_string(),
            ApiProvider::Claude,
        );

        let result = service.validate_api_key();

        assert!(result.is_err());
        match result {
            Err(PageGenError::InvalidApiKey { .. }) => (),
            _ => panic!("Expected InvalidApiKey error"),
        }
    }

    #[test]
    fn test_provider_parsing() {
        assert_eq!(
            ApiProvider::try_from("claude").unwrap(),
            ApiProvider::Claude
        );
        assert_eq!(
            ApiProvider::try_from("openai").unwrap(),
            ApiProvider::OpenAi
        );
        assert!(ApiProvider::try_from("other").is_err());
    }

    #[test]
    fn test_build_prompt_includes_context_when_provided() {
        let service = create_test_service();

        let request = service.build_prompt("Make it blue", Some("<html>Previous</html>"));

        assert!(request.system_prompt.is_some());
        assert!(request.messages[0].content.contains("Current page HTML"));
        assert!(request.messages[0]
            .content
            .contains("<html>Previous</html>"));
    }

    #[test]
    fn test_extract_openai_text_from_output_text() {
        let payload = json!({
            "output_text": "```html\n<html>Test</html>\n```"
        });

        assert_eq!(
            extract_openai_text(&payload),
            Some("```html\n<html>Test</html>\n```".to_string())
        );
    }

    #[test]
    fn test_extract_openai_text_from_output_content() {
        let payload = json!({
            "output": [
                {
                    "content": [
                        {
                            "type": "output_text",
                            "text": "hello"
                        }
                    ]
                }
            ]
        });

        assert_eq!(extract_openai_text(&payload), Some("hello".to_string()));
    }

    #[test]
    fn test_extract_claude_text() {
        let payload = json!({
            "content": [
                {
                    "type": "text",
                    "text": "```html\n<html>Claude</html>\n```"
                }
            ]
        });

        assert_eq!(
            extract_claude_text(&payload),
            Some("```html\n<html>Claude</html>\n```".to_string())
        );
    }

    #[test]
    fn test_extract_html_document_finds_full_document() {
        let response = "prefix <!DOCTYPE html><html><body>Hello</body></html> suffix";
        let extracted = extract_html_document(response);

        assert_eq!(
            extracted,
            Some("<!DOCTYPE html><html><body>Hello</body></html>".to_string())
        );
    }

    #[test]
    fn test_truncate_context_short_input_unchanged() {
        assert_eq!(truncate_context("abc", 10), "abc".to_string());
    }

    #[test]
    fn test_truncate_context_long_input_adds_marker() {
        let result = truncate_context("abcdefghij", 5);
        assert!(result.contains("abcde"));
        assert!(result.contains("Context truncated"));
    }
}

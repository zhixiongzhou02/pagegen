pub fn extract_html_code(response: &str) -> Option<String> {
    // (?s) flag makes . match newlines too
    let re = regex::Regex::new(r"```(?:html)?\s*\n([\s\S]*?)\n```").ok()?;
    re.captures(response)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().trim().to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_html_from_markdown_code_block() {
        let response = r#"Here is the code:

```html
<!DOCTYPE html>
<html>
<body>Hello</body>
</html>
```

Hope you like it!"#;

        let result = extract_html_code(response);

        assert!(result.is_some());
        assert!(result.unwrap().contains("<!DOCTYPE html>"));
    }

    #[test]
    fn test_extract_html_from_generic_code_block() {
        let response = r#"```
<div>Simple div</div>
```"#;

        let result = extract_html_code(response);

        assert!(result.is_some());
        assert_eq!(result.unwrap(), "<div>Simple div</div>");
    }

    #[test]
    fn test_extract_html_no_code_block_returns_none() {
        let response = "Just plain text without code";

        let result = extract_html_code(response);

        assert!(result.is_none());
    }
}

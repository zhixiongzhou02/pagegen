pub fn extract_html_code(response: &str) -> Option<String> {
    // (?s) flag makes . match newlines too
    let re = regex::Regex::new(r"```(?:html)?\s*\n([\s\S]*?)\n```").ok()?;
    re.captures(response)
        .and_then(|cap| cap.get(1))
        .map(|m| m.as_str().trim().to_string())
}

fn escape_html(input: &str) -> String {
    input
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
        .replace('\'', "&#39;")
}

pub fn generate_html_from_prompt(prompt: &str, existing_code: Option<&str>) -> String {
    let safe_prompt = escape_html(prompt.trim());
    let feature_items = prompt
        .split(|c| c == ',' || c == '，' || c == '、' || c == ';' || c == '；')
        .map(str::trim)
        .filter(|item| !item.is_empty())
        .take(4)
        .map(escape_html)
        .collect::<Vec<_>>();

    let features = if feature_items.is_empty() {
        vec![
            "响应式布局".to_string(),
            "清晰的信息层级".to_string(),
            "可直接继续修改的 HTML 结构".to_string(),
        ]
    } else {
        feature_items
    };

    let feature_list = features
        .iter()
        .map(|item| format!(r#"<li>{}</li>"#, item))
        .collect::<Vec<_>>()
        .join("\n            ");

    let context_note = existing_code
        .filter(|code| !code.trim().is_empty())
        .map(|_| {
            "<p class=\"meta\">已根据当前页面上下文重新生成内容，可继续迭代修改。</p>".to_string()
        })
        .unwrap_or_default();

    format!(
        r##"<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>PageGen Preview</title>
    <style>
      :root {{
        color-scheme: light;
        --bg: #f4f7fb;
        --surface: #ffffff;
        --text: #0f172a;
        --muted: #64748b;
        --primary: #0ea5e9;
        --primary-strong: #0369a1;
        --border: #dbe4f0;
      }}

      * {{
        box-sizing: border-box;
      }}

      body {{
        margin: 0;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top right, rgba(14, 165, 233, 0.18), transparent 28%),
          linear-gradient(180deg, #f8fbff 0%, var(--bg) 100%);
      }}

      .shell {{
        min-height: 100vh;
        padding: 48px 24px 64px;
      }}

      .card {{
        max-width: 960px;
        margin: 0 auto;
        background: rgba(255, 255, 255, 0.88);
        backdrop-filter: blur(10px);
        border: 1px solid var(--border);
        border-radius: 28px;
        overflow: hidden;
        box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
      }}

      .hero {{
        padding: 56px 56px 32px;
        border-bottom: 1px solid var(--border);
      }}

      .badge {{
        display: inline-flex;
        align-items: center;
        gap: 8px;
        padding: 8px 14px;
        border-radius: 999px;
        background: rgba(14, 165, 233, 0.1);
        color: var(--primary-strong);
        font-size: 14px;
        font-weight: 600;
      }}

      h1 {{
        margin: 18px 0 16px;
        font-size: clamp(34px, 6vw, 56px);
        line-height: 1.02;
      }}

      .lead {{
        margin: 0;
        max-width: 720px;
        color: var(--muted);
        font-size: 18px;
        line-height: 1.7;
      }}

      .meta {{
        margin-top: 16px;
        color: var(--primary-strong);
        font-size: 14px;
        font-weight: 500;
      }}

      .content {{
        display: grid;
        grid-template-columns: 1.15fr 0.85fr;
        gap: 0;
      }}

      .section {{
        padding: 36px 56px 48px;
      }}

      .section + .section {{
        border-left: 1px solid var(--border);
        background: rgba(248, 250, 252, 0.72);
      }}

      h2 {{
        margin: 0 0 18px;
        font-size: 18px;
      }}

      ul {{
        margin: 0;
        padding-left: 20px;
        color: var(--muted);
        line-height: 1.8;
      }}

      .cta {{
        margin-top: 28px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 14px 22px;
        border-radius: 14px;
        background: var(--primary);
        color: white;
        text-decoration: none;
        font-weight: 600;
      }}

      .prompt-box {{
        margin-top: 22px;
        padding: 18px;
        border-radius: 18px;
        background: #0f172a;
        color: #e2e8f0;
        font-size: 14px;
        line-height: 1.7;
        white-space: pre-wrap;
      }}

      @media (max-width: 860px) {{
        .hero,
        .section {{
          padding-left: 24px;
          padding-right: 24px;
        }}

        .content {{
          grid-template-columns: 1fr;
        }}

        .section + .section {{
          border-left: 0;
          border-top: 1px solid var(--border);
        }}
      }}
    </style>
  </head>
  <body>
    <div class="shell">
      <div class="card">
        <section class="hero">
          <div class="badge">PageGen 本地生成预览</div>
          <h1>{safe_prompt}</h1>
          <p class="lead">这是根据你的描述即时生成的首版页面。当前版本使用本地模板生成，目的是先打通项目创建、消息发送、页面保存和实时预览的完整链路。</p>
          {context_note}
        </section>
        <div class="content">
          <section class="section">
            <h2>页面方向</h2>
            <ul>
              {feature_list}
            </ul>
            <a class="cta" href="#details">继续迭代这个页面</a>
          </section>
          <section class="section" id="details">
            <h2>原始需求</h2>
            <div class="prompt-box">{safe_prompt}</div>
          </section>
        </div>
      </div>
    </div>
  </body>
</html>"#
 </html>"##
    )
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

    #[test]
    fn test_generate_html_from_prompt_contains_prompt() {
        let result = generate_html_from_prompt("一个蓝色的登录页", None);

        assert!(result.contains("<!DOCTYPE html>"));
        assert!(result.contains("一个蓝色的登录页"));
        assert!(result.contains("PageGen 本地生成预览"));
    }

    #[test]
    fn test_generate_html_from_prompt_escapes_input() {
        let result = generate_html_from_prompt("<script>alert(1)</script>", None);

        assert!(result.contains("&lt;script&gt;alert(1)&lt;/script&gt;"));
        assert!(!result.contains("<script>alert(1)</script>"));
    }
}

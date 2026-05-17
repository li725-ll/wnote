mod parser;
mod renderer;

use wasm_bindgen::prelude::*;

// ── WASM 导出 ─────────────────────────────────────────────────

/// 将 Markdown 渲染为 HTML 字符串
/// 适用于：SSR、整页渲染、预览
#[wasm_bindgen]
pub fn render(markdown: &str) -> String {
    let doc = parser::parse(markdown);
    renderer::render_html(&doc)
}

/// 将 Markdown 解析为 AST JSON 字符串
/// 适用于：WYSIWYG 编辑器，前端按 block 增量更新
#[wasm_bindgen]
pub fn parse(markdown: &str) -> Result<JsValue, JsValue> {
    let doc = parser::parse(markdown);
    serde_wasm_bindgen::to_value(&doc).map_err(|e| JsValue::from_str(&e.to_string()))
}

/// 将单个 Markdown block（一段文本）解析为 AST JSON
/// 适用于：编辑器光标离开某个 block 时的局部更新
#[wasm_bindgen]
pub fn parse_block(markdown: &str) -> Result<JsValue, JsValue> {
    let doc = parser::parse(markdown);
    let block = doc.children.into_iter().next();
    serde_wasm_bindgen::to_value(&block).map_err(|e| JsValue::from_str(&e.to_string()))
}

// ── Node.js 同步导出（非 WASM，供 Electron 主进程 SSR 使用）──

/// 仅在非 WASM 环境（Node.js native addon 或直接 Rust 调用）下使用
pub fn render_sync(markdown: &str) -> String {
    let doc = parser::parse(markdown);
    renderer::render_html(&doc)
}

pub fn parse_sync(markdown: &str) -> parser::ast::Document {
    parser::parse(markdown)
}

// ── 测试 ──────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_render_heading() {
        let html = render_sync("# Hello World");
        assert!(html.contains("<h1>"));
        assert!(html.contains("Hello World"));
        assert!(html.contains("</h1>"));
    }

    #[test]
    fn test_render_paragraph() {
        let html = render_sync("Hello **world**");
        assert!(html.contains("<p>"));
        assert!(html.contains("<strong>world</strong>"));
    }

    #[test]
    fn test_render_code_block() {
        let html = render_sync("```rust\nfn main() {}\n```");
        assert!(html.contains("<pre><code class=\"language-rust\">"));
    }

    #[test]
    fn test_render_table() {
        let md = "| A | B |\n|---|---|\n| 1 | 2 |";
        let html = render_sync(md);
        assert!(html.contains("<table>"));
        assert!(html.contains("<th>"));
        assert!(html.contains("<td>"));
    }

    #[test]
    fn test_render_task_list() {
        let md = "- [x] done\n- [ ] todo";
        let html = render_sync(md);
        assert!(html.contains("checked"));
        assert!(html.contains("task-list-item"));
    }

    #[test]
    fn test_parse_ast() {
        let doc = parse_sync("# Title\n\nParagraph");
        assert_eq!(doc.children.len(), 2);
    }

    #[test]
    fn test_xss_escape() {
        // pulldown-cmark GFM 模式会过滤 <script> 块，输出为空
        let html = render_sync("<script>alert(1)</script>");
        assert!(!html.contains("<script>"));

        // 段落内的 HTML 实体应被转义
        let html2 = render_sync("text with &lt;b&gt; entity");
        assert!(html2.contains("&lt;b&gt;"));
    }
}

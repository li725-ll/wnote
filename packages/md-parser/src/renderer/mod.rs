use crate::parser::ast::*;

/// 将 AST 渲染为 HTML 字符串
pub fn render_html(doc: &Document) -> String {
    let mut out = String::new();
    for block in &doc.children {
        render_block(block, &mut out);
    }
    out
}

fn render_block(node: &BlockNode, out: &mut String) {
    match node {
        BlockNode::Heading { level, children, .. } => {
            out.push_str(&format!("<h{}>", level));
            for inline in children {
                render_inline(inline, out);
            }
            out.push_str(&format!("</h{}>", level));
        }

        BlockNode::Paragraph { children, .. } => {
            out.push_str("<p>");
            for inline in children {
                render_inline(inline, out);
            }
            out.push_str("</p>");
        }

        BlockNode::CodeBlock { lang, code, .. } => {
            let lang_attr = lang
                .as_deref()
                .map(|l| format!(" class=\"language-{}\"", escape_attr(l)))
                .unwrap_or_default();
            out.push_str(&format!("<pre><code{}>", lang_attr));
            out.push_str(&escape_html(code));
            out.push_str("</code></pre>");
        }

        BlockNode::Blockquote { children, .. } => {
            out.push_str("<blockquote>");
            for child in children {
                render_block(child, out);
            }
            out.push_str("</blockquote>");
        }

        BlockNode::BulletList { items, .. } => {
            out.push_str("<ul>");
            for item in items {
                render_list_item(item, out);
            }
            out.push_str("</ul>");
        }

        BlockNode::OrderedList { start, items, .. } => {
            if *start == 1 {
                out.push_str("<ol>");
            } else {
                out.push_str(&format!("<ol start=\"{}\">", start));
            }
            for item in items {
                render_list_item(item, out);
            }
            out.push_str("</ol>");
        }

        BlockNode::ThematicBreak { .. } => {
            out.push_str("<hr>");
        }

        BlockNode::HtmlBlock { html, .. } => {
            // 原样输出，不转义
            out.push_str(html);
        }

        BlockNode::Table { headers, rows, alignments, .. } => {
            out.push_str("<table><thead><tr>");
            for (i, cell) in headers.iter().enumerate() {
                let align = align_attr(alignments.get(i));
                out.push_str(&format!("<th{}>", align));
                for inline in &cell.children {
                    render_inline(inline, out);
                }
                out.push_str("</th>");
            }
            out.push_str("</tr></thead><tbody>");
            for row in rows {
                out.push_str("<tr>");
                for (i, cell) in row.iter().enumerate() {
                    let align = align_attr(alignments.get(i));
                    out.push_str(&format!("<td{}>", align));
                    for inline in &cell.children {
                        render_inline(inline, out);
                    }
                    out.push_str("</td>");
                }
                out.push_str("</tr>");
            }
            out.push_str("</tbody></table>");
        }
    }
}

fn render_list_item(item: &ListItem, out: &mut String) {
    match item.checked {
        Some(checked) => {
            let checked_attr = if checked { " checked" } else { "" };
            out.push_str("<li class=\"task-list-item\">");
            out.push_str(&format!(
                "<input type=\"checkbox\" disabled{}>",
                checked_attr
            ));
            // 任务列表项的第一个段落不包 <p>
            for (i, child) in item.children.iter().enumerate() {
                if i == 0 {
                    if let BlockNode::Paragraph { children, .. } = child {
                        for inline in children {
                            render_inline(inline, out);
                        }
                        continue;
                    }
                }
                render_block(child, out);
            }
            out.push_str("</li>");
        }
        None => {
            out.push_str("<li>");
            // 紧凑列表（单个段落）不包 <p>
            if item.children.len() == 1 {
                if let BlockNode::Paragraph { children, .. } = &item.children[0] {
                    for inline in children {
                        render_inline(inline, out);
                    }
                    out.push_str("</li>");
                    return;
                }
            }
            for child in &item.children {
                render_block(child, out);
            }
            out.push_str("</li>");
        }
    }
}

fn render_inline(node: &InlineNode, out: &mut String) {
    match node {
        InlineNode::Text { value } => out.push_str(&escape_html(value)),
        InlineNode::Code { value } => {
            out.push_str("<code>");
            out.push_str(&escape_html(value));
            out.push_str("</code>");
        }
        InlineNode::Strong { children } => {
            out.push_str("<strong>");
            for child in children {
                render_inline(child, out);
            }
            out.push_str("</strong>");
        }
        InlineNode::Emphasis { children } => {
            out.push_str("<em>");
            for child in children {
                render_inline(child, out);
            }
            out.push_str("</em>");
        }
        InlineNode::Strikethrough { children } => {
            out.push_str("<del>");
            for child in children {
                render_inline(child, out);
            }
            out.push_str("</del>");
        }
        InlineNode::Link { href, title, children } => {
            let title_attr = title
                .as_deref()
                .map(|t| format!(" title=\"{}\"", escape_attr(t)))
                .unwrap_or_default();
            out.push_str(&format!(
                "<a href=\"{}\"{}> ",
                escape_attr(href),
                title_attr
            ));
            for child in children {
                render_inline(child, out);
            }
            out.push_str("</a>");
        }
        InlineNode::Image { src, alt, title } => {
            let title_attr = title
                .as_deref()
                .map(|t| format!(" title=\"{}\"", escape_attr(t)))
                .unwrap_or_default();
            out.push_str(&format!(
                "<img src=\"{}\" alt=\"{}\"{}>",
                escape_attr(src),
                escape_attr(alt),
                title_attr
            ));
        }
        InlineNode::SoftBreak => out.push('\n'),
        InlineNode::HardBreak => out.push_str("<br>"),
        InlineNode::Html { value } => out.push_str(value),
    }
}

// ── 工具函数 ──────────────────────────────────────────────────

fn escape_html(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn escape_attr(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('"', "&quot;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

fn align_attr(alignment: Option<&Alignment>) -> String {
    match alignment {
        Some(Alignment::Left) => " style=\"text-align:left\"".to_string(),
        Some(Alignment::Center) => " style=\"text-align:center\"".to_string(),
        Some(Alignment::Right) => " style=\"text-align:right\"".to_string(),
        _ => String::new(),
    }
}

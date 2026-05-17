pub mod ast;

use pulldown_cmark::{
    Alignment as CmarkAlignment, Event, HeadingLevel, Options, Parser, Tag, TagEnd,
};

use self::ast::*;

/// pulldown-cmark 开启的扩展选项
fn parser_options() -> Options {
    Options::ENABLE_TABLES
        | Options::ENABLE_FOOTNOTES
        | Options::ENABLE_STRIKETHROUGH
        | Options::ENABLE_TASKLISTS
        | Options::ENABLE_SMART_PUNCTUATION
        | Options::ENABLE_HEADING_ATTRIBUTES
        | Options::ENABLE_GFM
}

pub fn parse(input: &str) -> Document {
    let parser = Parser::new_ext(input, parser_options());
    let events: Vec<Event> = parser.collect();
    let mut ctx = ParseContext::new(input, &events);
    let children = ctx.parse_blocks();
    Document { children }
}

// ── 解析上下文 ────────────────────────────────────────────────

struct ParseContext<'a> {
    events: &'a [Event<'a>],
    pos: usize,
}

impl<'a> ParseContext<'a> {
    fn new(_source: &'a str, events: &'a [Event<'a>]) -> Self {
        Self { events, pos: 0 }
    }

    fn peek(&self) -> Option<&Event<'a>> {
        self.events.get(self.pos)
    }

    fn next(&mut self) -> Option<&Event<'a>> {
        let e = self.events.get(self.pos);
        if e.is_some() {
            self.pos += 1;
        }
        e
    }

    // ── 块级解析 ──────────────────────────────────────────────

    fn parse_blocks(&mut self) -> Vec<BlockNode> {
        let mut blocks = Vec::new();
        while self.pos < self.events.len() {
            match self.peek() {
                Some(Event::Start(_)) => {
                    if let Some(block) = self.parse_block() {
                        blocks.push(block);
                    }
                }
                Some(Event::End(_)) | None => break,
                _ => {
                    self.next();
                }
            }
        }
        blocks
    }

    fn parse_block(&mut self) -> Option<BlockNode> {
        match self.peek()? {
            Event::Start(Tag::Heading { level, .. }) => Some(self.parse_heading(*level)),
            Event::Start(Tag::Paragraph) => Some(self.parse_paragraph()),
            Event::Start(Tag::CodeBlock(_)) => Some(self.parse_code_block()),
            Event::Start(Tag::BlockQuote(_)) => Some(self.parse_blockquote()),
            Event::Start(Tag::List(start)) => {
                let start = *start;
                Some(self.parse_list(start))
            }
            Event::Start(Tag::Table(alignments)) => {
                let alignments = alignments.clone();
                Some(self.parse_table(alignments))
            }
            Event::Rule => {
                self.next();
                Some(BlockNode::ThematicBreak { raw: "---".to_string() })
            }
            Event::Html(html) => {
                let html = html.to_string();
                self.next();
                Some(BlockNode::HtmlBlock { html: html.clone(), raw: html })
            }
            _ => {
                self.next();
                None
            }
        }
    }

    fn parse_heading(&mut self, level: HeadingLevel) -> BlockNode {
        self.next(); // consume Start(Heading)
        let level_num = heading_level_to_u8(level);
        let children = self.parse_inlines_until_end();
        let raw = format!("{} {}", "#".repeat(level_num as usize), inlines_to_text(&children));
        BlockNode::Heading { level: level_num, children, raw }
    }

    fn parse_paragraph(&mut self) -> BlockNode {
        self.next(); // consume Start(Paragraph)
        let children = self.parse_inlines_until_end();
        let raw = inlines_to_text(&children);
        BlockNode::Paragraph { children, raw }
    }

    fn parse_code_block(&mut self) -> BlockNode {
        let lang = match self.next() {
            Some(Event::Start(Tag::CodeBlock(kind))) => match kind {
                pulldown_cmark::CodeBlockKind::Fenced(lang) => {
                    let s = lang.to_string();
                    if s.is_empty() { None } else { Some(s) }
                }
                pulldown_cmark::CodeBlockKind::Indented => None,
            },
            _ => None,
        };
        let mut code = String::new();
        loop {
            match self.next() {
                Some(Event::Text(t)) => code.push_str(t),
                Some(Event::End(TagEnd::CodeBlock)) | None => break,
                _ => {}
            }
        }
        let raw = match &lang {
            Some(l) => format!("```{}\n{}\n```", l, code),
            None => format!("```\n{}\n```", code),
        };
        BlockNode::CodeBlock { lang, code, raw }
    }

    fn parse_blockquote(&mut self) -> BlockNode {
        self.next(); // consume Start(BlockQuote)
        let children = self.parse_blocks();
        // consume End(BlockQuote)
        if matches!(self.peek(), Some(Event::End(TagEnd::BlockQuote(_)))) {
            self.next();
        }
        let raw = format!("> {}", blocks_to_raw_text(&children));
        BlockNode::Blockquote { children, raw }
    }

    fn parse_list(&mut self, start: Option<u64>) -> BlockNode {
        self.next(); // consume Start(List)
        let mut items = Vec::new();
        loop {
            match self.peek() {
                Some(Event::Start(Tag::Item)) => {
                    items.push(self.parse_list_item());
                }
                Some(Event::End(TagEnd::List(_))) | None => {
                    self.next();
                    break;
                }
                _ => {
                    self.next();
                }
            }
        }
        let raw = items.iter().map(|i| i.raw.clone()).collect::<Vec<_>>().join("\n");
        match start {
            None => BlockNode::BulletList { items, raw },
            Some(n) => BlockNode::OrderedList { start: n, items, raw },
        }
    }

    fn parse_list_item(&mut self) -> ListItem {
        self.next(); // consume Start(Item)
        let mut checked: Option<bool> = None;
        // GFM 任务列表：第一个事件可能是 TaskListMarker
        if matches!(self.peek(), Some(Event::TaskListMarker(_))) {
            if let Some(Event::TaskListMarker(c)) = self.next() {
                checked = Some(*c);
            }
        }
        let children = self.parse_blocks();
        if matches!(self.peek(), Some(Event::End(TagEnd::Item))) {
            self.next();
        }
        let raw = blocks_to_raw_text(&children);
        ListItem { children, checked, raw }
    }

    fn parse_table(&mut self, cmark_alignments: Vec<CmarkAlignment>) -> BlockNode {
        self.next(); // consume Start(Table)
        let alignments: Vec<Alignment> = cmark_alignments
            .iter()
            .map(|a| match a {
                CmarkAlignment::Left => Alignment::Left,
                CmarkAlignment::Center => Alignment::Center,
                CmarkAlignment::Right => Alignment::Right,
                CmarkAlignment::None => Alignment::None,
            })
            .collect();

        let mut headers = Vec::new();
        let mut rows: Vec<Vec<TableCell>> = Vec::new();

        loop {
            match self.peek() {
                Some(Event::Start(Tag::TableHead)) => {
                    self.next();
                    headers = self.parse_table_row();
                    if matches!(self.peek(), Some(Event::End(TagEnd::TableHead))) {
                        self.next();
                    }
                }
                Some(Event::Start(Tag::TableRow)) => {
                    self.next();
                    rows.push(self.parse_table_row());
                    if matches!(self.peek(), Some(Event::End(TagEnd::TableRow))) {
                        self.next();
                    }
                }
                Some(Event::End(TagEnd::Table)) | None => {
                    self.next();
                    break;
                }
                _ => {
                    self.next();
                }
            }
        }

        let raw = String::new(); // 表格 raw 由渲染层重建
        BlockNode::Table { headers, rows, alignments, raw }
    }

    fn parse_table_row(&mut self) -> Vec<TableCell> {
        let mut cells = Vec::new();
        loop {
            match self.peek() {
                Some(Event::Start(Tag::TableCell)) => {
                    self.next();
                    let children = self.parse_inlines_until_end();
                    cells.push(TableCell { children });
                }
                Some(Event::End(TagEnd::TableRow))
                | Some(Event::End(TagEnd::TableHead))
                | None => break,
                _ => {
                    self.next();
                }
            }
        }
        cells
    }

    // ── 行内解析 ──────────────────────────────────────────────

    fn parse_inlines_until_end(&mut self) -> Vec<InlineNode> {
        let mut nodes = Vec::new();
        loop {
            match self.peek() {
                Some(Event::End(_)) | None => {
                    self.next();
                    break;
                }
                _ => {
                    if let Some(node) = self.parse_inline() {
                        nodes.push(node);
                    }
                }
            }
        }
        nodes
    }

    fn parse_inline(&mut self) -> Option<InlineNode> {
        match self.peek()? {
            Event::Text(_) => {
                if let Some(Event::Text(t)) = self.next() {
                    Some(InlineNode::Text { value: t.to_string() })
                } else {
                    None
                }
            }
            Event::Code(_) => {
                if let Some(Event::Code(c)) = self.next() {
                    Some(InlineNode::Code { value: c.to_string() })
                } else {
                    None
                }
            }
            Event::Html(_) => {
                if let Some(Event::Html(h)) = self.next() {
                    Some(InlineNode::Html { value: h.to_string() })
                } else {
                    None
                }
            }
            Event::SoftBreak => {
                self.next();
                Some(InlineNode::SoftBreak)
            }
            Event::HardBreak => {
                self.next();
                Some(InlineNode::HardBreak)
            }
            Event::Start(Tag::Strong) => {
                self.next();
                let children = self.parse_inlines_until_end();
                Some(InlineNode::Strong { children })
            }
            Event::Start(Tag::Emphasis) => {
                self.next();
                let children = self.parse_inlines_until_end();
                Some(InlineNode::Emphasis { children })
            }
            Event::Start(Tag::Strikethrough) => {
                self.next();
                let children = self.parse_inlines_until_end();
                Some(InlineNode::Strikethrough { children })
            }
            Event::Start(Tag::Link { dest_url, title, .. }) => {
                let href = dest_url.to_string();
                let title = if title.is_empty() { None } else { Some(title.to_string()) };
                self.next();
                let children = self.parse_inlines_until_end();
                Some(InlineNode::Link { href, title, children })
            }
            Event::Start(Tag::Image { dest_url, title, .. }) => {
                let src = dest_url.to_string();
                let title = if title.is_empty() { None } else { Some(title.to_string()) };
                self.next();
                // image alt text 在子事件里
                let alt_nodes = self.parse_inlines_until_end();
                let alt = inlines_to_text(&alt_nodes);
                Some(InlineNode::Image { src, alt, title })
            }
            _ => {
                self.next();
                None
            }
        }
    }
}

// ── 辅助函数 ──────────────────────────────────────────────────

fn heading_level_to_u8(level: HeadingLevel) -> u8 {
    match level {
        HeadingLevel::H1 => 1,
        HeadingLevel::H2 => 2,
        HeadingLevel::H3 => 3,
        HeadingLevel::H4 => 4,
        HeadingLevel::H5 => 5,
        HeadingLevel::H6 => 6,
    }
}

pub fn inlines_to_text(nodes: &[InlineNode]) -> String {
    let mut out = String::new();
    for node in nodes {
        match node {
            InlineNode::Text { value } => out.push_str(value),
            InlineNode::Code { value } => {
                out.push('`');
                out.push_str(value);
                out.push('`');
            }
            InlineNode::Strong { children } => {
                out.push_str("**");
                out.push_str(&inlines_to_text(children));
                out.push_str("**");
            }
            InlineNode::Emphasis { children } => {
                out.push('*');
                out.push_str(&inlines_to_text(children));
                out.push('*');
            }
            InlineNode::Strikethrough { children } => {
                out.push_str("~~");
                out.push_str(&inlines_to_text(children));
                out.push_str("~~");
            }
            InlineNode::Link { href, children, .. } => {
                out.push('[');
                out.push_str(&inlines_to_text(children));
                out.push_str("](");
                out.push_str(href);
                out.push(')');
            }
            InlineNode::Image { src, alt, .. } => {
                out.push_str("![");
                out.push_str(alt);
                out.push_str("](");
                out.push_str(src);
                out.push(')');
            }
            InlineNode::SoftBreak => out.push('\n'),
            InlineNode::HardBreak => out.push_str("  \n"),
            InlineNode::Html { value } => out.push_str(value),
        }
    }
    out
}

fn blocks_to_raw_text(blocks: &[BlockNode]) -> String {
    blocks
        .iter()
        .map(|b| match b {
            BlockNode::Paragraph { raw, .. } => raw.clone(),
            BlockNode::Heading { raw, .. } => raw.clone(),
            BlockNode::CodeBlock { raw, .. } => raw.clone(),
            BlockNode::Blockquote { raw, .. } => raw.clone(),
            BlockNode::BulletList { raw, .. } => raw.clone(),
            BlockNode::OrderedList { raw, .. } => raw.clone(),
            BlockNode::ThematicBreak { raw } => raw.clone(),
            BlockNode::HtmlBlock { raw, .. } => raw.clone(),
            BlockNode::Table { raw, .. } => raw.clone(),
        })
        .collect::<Vec<_>>()
        .join("\n\n")
}

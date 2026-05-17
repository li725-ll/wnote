use serde::{Deserialize, Serialize};

/// 块级节点类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum BlockNode {
    /// # 标题
    Heading {
        level: u8,
        children: Vec<InlineNode>,
        /// 原始 markdown 源码（用于 WYSIWYG 编辑态）
        raw: String,
    },
    /// 段落
    Paragraph {
        children: Vec<InlineNode>,
        raw: String,
    },
    /// 代码块
    CodeBlock {
        lang: Option<String>,
        code: String,
        raw: String,
    },
    /// 引用块
    Blockquote {
        children: Vec<BlockNode>,
        raw: String,
    },
    /// 无序列表
    BulletList {
        items: Vec<ListItem>,
        raw: String,
    },
    /// 有序列表
    OrderedList {
        start: u64,
        items: Vec<ListItem>,
        raw: String,
    },
    /// 分割线
    ThematicBreak { raw: String },
    /// HTML 块
    HtmlBlock { html: String, raw: String },
    /// 表格（GFM）
    Table {
        headers: Vec<TableCell>,
        rows: Vec<Vec<TableCell>>,
        alignments: Vec<Alignment>,
        raw: String,
    },
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct ListItem {
    pub children: Vec<BlockNode>,
    /// GFM 任务列表
    pub checked: Option<bool>,
    pub raw: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct TableCell {
    pub children: Vec<InlineNode>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum Alignment {
    None,
    Left,
    Center,
    Right,
}

/// 行内节点类型
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum InlineNode {
    Text { value: String },
    Strong { children: Vec<InlineNode> },
    Emphasis { children: Vec<InlineNode> },
    Strikethrough { children: Vec<InlineNode> },
    Code { value: String },
    Link { href: String, title: Option<String>, children: Vec<InlineNode> },
    Image { src: String, alt: String, title: Option<String> },
    HardBreak,
    SoftBreak,
    Html { value: String },
}

/// 完整文档 AST
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Document {
    pub children: Vec<BlockNode>,
}

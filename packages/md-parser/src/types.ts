// AST 类型定义，与 Rust 端 serde 序列化结构一一对应

export type Alignment = "none" | "left" | "center" | "right";

export interface TableCell {
  children: InlineNode[];
}

export interface ListItem {
  children: BlockNode[];
  checked: boolean | null;
  raw: string;
}

// ── 行内节点 ──────────────────────────────────────────────────

export type InlineNode =
  | { type: "text"; value: string }
  | { type: "strong"; children: InlineNode[] }
  | { type: "emphasis"; children: InlineNode[] }
  | { type: "strikethrough"; children: InlineNode[] }
  | { type: "code"; value: string }
  | { type: "link"; href: string; title: string | null; children: InlineNode[] }
  | { type: "image"; src: string; alt: string; title: string | null }
  | { type: "hardBreak" }
  | { type: "softBreak" }
  | { type: "html"; value: string };

// ── 块级节点 ──────────────────────────────────────────────────

export type BlockNode =
  | { type: "heading"; level: number; children: InlineNode[]; raw: string }
  | { type: "paragraph"; children: InlineNode[]; raw: string }
  | { type: "codeBlock"; lang: string | null; code: string; raw: string }
  | { type: "blockquote"; children: BlockNode[]; raw: string }
  | { type: "bulletList"; items: ListItem[]; raw: string }
  | { type: "orderedList"; start: number; items: ListItem[]; raw: string }
  | { type: "thematicBreak"; raw: string }
  | { type: "htmlBlock"; html: string; raw: string }
  | {
      type: "table";
      headers: TableCell[];
      rows: TableCell[][];
      alignments: Alignment[];
      raw: string;
    };

// ── 文档根节点 ────────────────────────────────────────────────

export interface Document {
  children: BlockNode[];
}

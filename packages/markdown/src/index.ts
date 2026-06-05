import type { HeadingItem } from "@wnote/contracts";
import type { Element as HastElement, Nodes as HastNode } from "hast";
import { fromHtml } from "hast-util-from-html";
import { toHtml } from "hast-util-to-html";
import { toHast } from "mdast-util-to-hast";
import type {
  BlockContent,
  Break,
  Code,
  Content,
  Definition,
  Delete,
  FootnoteDefinition,
  Heading,
  Html,
  Image,
  InlineCode,
  Link,
  List,
  ListItem,
  Paragraph,
  PhrasingContent,
  Root,
  RootContent,
  Table,
  TableCell,
  TableRow,
  Text,
  ThematicBreak,
} from "mdast";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { visit } from "unist-util-visit";

export type MarkdownDocument = Root;

export interface MarkdownParseResult {
  markdown: string;
  document: MarkdownDocument;
  tree: MarkdownDocument;
  html: string;
  headings: HeadingItem[];
}

const markdownParser = unified().use(remarkParse).use(remarkGfm);
const markdownStringifier = unified().use(remarkGfm).use(remarkStringify, {
  bullet: "-",
  fences: true,
  incrementListMarker: true,
  rule: "-",
  ruleRepetition: 3,
});

export function parseMarkdown(markdown: string): MarkdownParseResult {
  const tree = markdownParser.parse(markdown) as MarkdownDocument;
  return {
    markdown,
    document: tree,
    tree,
    html: documentToHtml(tree),
    headings: extractHeadings(tree),
  };
}

export function stringifyMarkdown(input: MarkdownDocument | string): string {
  if (typeof input === "string") return input;
  return String(markdownStringifier.stringify(input));
}

export function markdownToHtml(markdown: string): string {
  return richMarkdownToHtml(parseMarkdown(markdown).html);
}

export function htmlToMarkdown(html: string): string {
  return restoreRichMarkdown(stringifyMarkdown(htmlToMarkdownDocument(html)));
}

export function markdownToEditorDocument(markdown: string): MarkdownDocument {
  return parseMarkdown(markdown).document;
}

export function editorDocumentToMarkdown(document: unknown, fallback = ""): string {
  if (typeof document === "string") return document;
  if (isMarkdownDocument(document)) return stringifyMarkdown(document);
  return fallback;
}

function documentToHtml(tree: MarkdownDocument): string {
  const hast = toHast(tree, { allowDangerousHtml: true });
  return richMarkdownToHtml(toHtml(hast, { allowDangerousHtml: true }));
}

function htmlToMarkdownDocument(html: string): MarkdownDocument {
  const hast = fromHtml(html, { fragment: true });
  return {
    type: "root",
    children: hast.children.flatMap((child) => hastToMdast(child)).filter(isRootContent),
  };
}

function hastToMdast(node: HastNode): Content[] {
  if (node.type === "text") return textNode(node.value);
  if (node.type !== "element") return [];

  const tagName = node.tagName.toLowerCase();
  const blockMath = stringProperty(node.properties.dataMathBlock);
  if (blockMath)
    return [{ type: "html", value: `<math-block>${escapeHtml(blockMath)}</math-block>` }];

  const inlineMath = stringProperty(node.properties.dataMathInline);
  if (inlineMath)
    return [{ type: "html", value: `<math-inline>${escapeHtml(inlineMath)}</math-inline>` }];

  const mermaid = stringProperty(node.properties.dataMermaidBlock);
  if (mermaid)
    return [{ type: "html", value: `<mermaid-block>${escapeHtml(mermaid)}</mermaid-block>` }];

  const children = node.children.flatMap((child) => hastToMdast(child));
  const phrasing = children.filter(isPhrasingContent);
  const blocks = children.filter(isRootContent);

  switch (tagName) {
    case "h1":
    case "h2":
    case "h3":
    case "h4":
    case "h5":
    case "h6":
      return [headingNode(Number(tagName.slice(1)) as Heading["depth"], phrasing)];
    case "p":
      return [paragraphNode(phrasing)];
    case "strong":
    case "b":
      return [{ type: "strong", children: phrasing }];
    case "em":
    case "i":
      return [{ type: "emphasis", children: phrasing }];
    case "s":
    case "strike":
    case "del":
      return [{ type: "delete", children: phrasing } satisfies Delete];
    case "code":
      return [{ type: "inlineCode", value: nodeText(node) } satisfies InlineCode];
    case "pre":
      return [codeNode(nodeText(node), codeLanguage(node))];
    case "blockquote":
      return [{ type: "blockquote", children: blocks.filter(isBlockContent) }];
    case "ul":
      return [listNode(false, node.children)];
    case "ol":
      return [listNode(true, node.children)];
    case "li":
      return listItemChildren(children);
    case "a":
      return [
        {
          type: "link",
          url: stringProperty(node.properties.href),
          title: stringProperty(node.properties.title) || null,
          children: phrasing,
        } satisfies Link,
      ];
    case "img":
      if (imageWidth(node)) return [{ type: "html", value: imageHtml(node) } satisfies Html];
      return [
        {
          type: "image",
          url: stringProperty(node.properties.src),
          alt: stringProperty(node.properties.alt),
          title: stringProperty(node.properties.title) || null,
        } satisfies Image,
      ];
    case "hr":
      return [{ type: "thematicBreak" } satisfies ThematicBreak];
    case "br":
      return [{ type: "break" } satisfies Break];
    case "input":
      return [];
    case "table":
      return [tableNode(node)];
    case "figure":
      if (figureImage(node)) return [{ type: "html", value: figureImageHtml(node) } satisfies Html];
      return blocks;
    case "thead":
    case "tbody":
    case "tr":
    case "th":
    case "td":
      return children;
    default:
      if (isKnownContainer(tagName)) return children;
      return [{ type: "html", value: toHtml(node) } satisfies Html];
  }
}

function listNode(ordered: boolean, children: HastNode[]): List {
  const items = children
    .filter((child): child is HastElement => child.type === "element" && child.tagName === "li")
    .map((child) => listItemNode(child));
  return { type: "list", ordered, start: ordered ? 1 : null, spread: false, children: items };
}

function listItemNode(node: HastElement): ListItem {
  const children = node.children.flatMap((child) => hastToMdast(child));
  return {
    type: "listItem",
    spread: false,
    checked: taskChecked(node),
    children: listItemChildren(children),
  };
}

function listItemChildren(children: Content[]): BlockContent[] {
  const blocks = children.filter(isBlockContent);
  const phrasing = children.filter(isPhrasingContent);
  if (blocks.length) return [...(phrasing.length ? [paragraphNode(phrasing)] : []), ...blocks];
  return [paragraphNode(phrasing)];
}

function tableNode(node: HastElement): Table {
  const rows = node.children
    .flatMap((child) => tableRows(child))
    .map((row) => ({
      type: "tableRow",
      children: row.children
        .filter(
          (cell): cell is HastElement =>
            cell.type === "element" && ["td", "th"].includes(cell.tagName),
        )
        .map((cell) => ({
          type: "tableCell",
          children: cell.children.flatMap((child) => hastToMdast(child)).filter(isPhrasingContent),
        })) satisfies TableCell[],
    })) satisfies TableRow[];
  return { type: "table", align: tableAlignments(rows, node), children: rows };
}

function tableAlignments(rows: TableRow[], node: HastElement): Table["align"] {
  const firstRow = node.children.flatMap((child) => tableRows(child))[0];
  const align = firstRow?.children
    .filter(
      (cell): cell is HastElement => cell.type === "element" && ["td", "th"].includes(cell.tagName),
    )
    .map((cell) => {
      const value = stringProperty(cell.properties.align).toLowerCase();
      if (value === "left" || value === "center" || value === "right") return value;
      return null;
    });
  return align?.length ? align : (rows[0]?.children.map(() => null) ?? []);
}

function tableRows(node: HastNode): HastElement[] {
  if (node.type !== "element") return [];
  if (node.tagName === "tr") return [node];
  if (["thead", "tbody"].includes(node.tagName))
    return node.children.flatMap((child) => tableRows(child));
  return [];
}

function taskChecked(node: HastElement): boolean | null {
  const first = node.children.find(
    (child): child is HastElement =>
      child.type === "element" &&
      child.tagName === "input" &&
      stringProperty(child.properties.type) === "checkbox",
  );
  if (!first) return null;
  return Boolean(first.properties.checked);
}

function codeLanguage(node: HastElement): string | null {
  const code = node.children.find(
    (child): child is HastElement => child.type === "element" && child.tagName === "code",
  );
  const dataLanguage = stringProperty(node.properties.dataLanguage);
  if (dataLanguage) return dataLanguage;
  const className = code?.properties.className;
  const classes = Array.isArray(className) ? className.map(String) : [];
  return classes.find((value) => value.startsWith("language-"))?.replace(/^language-/, "") ?? null;
}

function imageWidth(node: HastElement): string {
  return (
    stringProperty(node.properties.dataWidth) ||
    stringProperty(node.properties.width) ||
    styleWidth(stringProperty(node.properties.style))
  );
}

function imageHtml(node: HastElement): string {
  const src = stringProperty(node.properties.src);
  const alt = stringProperty(node.properties.alt);
  const title = stringProperty(node.properties.title);
  const width = imageWidth(node);
  const attributes = [
    ["src", src],
    ["alt", alt],
    ["title", title],
    ["width", width],
  ]
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(" ");
  return `<img ${attributes}>`;
}

function figureImage(node: HastElement): HastElement | null {
  return (
    node.children.find(
      (child): child is HastElement => child.type === "element" && child.tagName === "img",
    ) ?? null
  );
}

function figureImageHtml(node: HastElement): string {
  const image = figureImage(node);
  if (!image) return toHtml(node);
  const align = imageAlign(node);
  const caption = node.children.find(
    (child): child is HastElement => child.type === "element" && child.tagName === "figcaption",
  );
  const attributes = [
    ["data-wnote-image", "true"],
    ["data-align", align],
  ]
    .filter(([, value]) => value)
    .map(([name, value]) => `${name}="${escapeAttribute(value)}"`)
    .join(" ");
  const figureAttributes = attributes ? ` ${attributes}` : "";
  const captionHtml = caption
    ? `<figcaption>${escapeHtml(nodeText(caption).trim())}</figcaption>`
    : "";
  return `<figure${figureAttributes}>${imageHtml(image)}${captionHtml}</figure>`;
}

function imageAlign(node: HastElement): string {
  const value =
    stringProperty(node.properties.dataAlign) ||
    stringProperty(node.properties.align) ||
    styleTextAlign(stringProperty(node.properties.style));
  return value === "left" || value === "center" || value === "right" ? value : "";
}

function styleWidth(style: string): string {
  return /(?:^|;)\s*width\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim() ?? "";
}

function styleTextAlign(style: string): string {
  return /(?:^|;)\s*text-align\s*:\s*([^;]+)/i.exec(style)?.[1]?.trim() ?? "";
}

function extractHeadings(tree: MarkdownDocument): HeadingItem[] {
  const headings: HeadingItem[] = [];
  visit(tree, "heading", (node: Heading, index, parent) => {
    const text = phrasingToText(node.children);
    headings.push({
      id: slugify(text),
      level: node.depth,
      text,
      from: typeof index === "number" ? index : headings.length,
    });
    markUnused(parent);
  });
  return headings;
}

function headingNode(depth: Heading["depth"], children: PhrasingContent[]): Heading {
  return { type: "heading", depth, children };
}

function paragraphNode(children: PhrasingContent[]): Paragraph {
  return { type: "paragraph", children };
}

function codeNode(value: string, lang: string | null): Code {
  return { type: "code", lang, meta: null, value: value.replace(/\n+$/g, "") };
}

function textNode(value: string): Text[] {
  return value ? [{ type: "text", value }] : [];
}

function richMarkdownToHtml(html: string): string {
  html = html.replace(
    /<pre><code class="language-mermaid">([\s\S]*?)<\/code><\/pre>/g,
    (_, source: string) => {
      const diagram = decodeEntities(source).trim();
      return `<div data-mermaid-block="${escapeAttribute(diagram)}">${escapeHtml(diagram)}</div>`;
    },
  );
  html = html.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_, source: string) => {
    const formula = source.trim();
    return `<div data-math-block="${escapeAttribute(formula)}">${escapeHtml(formula)}</div>`;
  });
  html = html.replace(/<p>\s*(<div data-math-block="[^"]*">[\s\S]*?<\/div>)\s*<\/p>/g, "$1");
  return html.replace(/(?<!\$)\$([^$\n]+)\$(?!\$)/g, (_, source: string) => {
    const formula = source.trim();
    return `<span data-math-inline="${escapeAttribute(formula)}">${escapeHtml(formula)}</span>`;
  });
}

function restoreRichMarkdown(markdown: string): string {
  let restored = markdown
    .replace(/<mermaid-block>([\s\S]*?)<\/mermaid-block>/g, (_, source: string) => {
      return `\`\`\`mermaid\n${decodeEntities(source).trim()}\n\`\`\``;
    })
    .replace(/<math-block>([\s\S]*?)<\/math-block>/g, (_, source: string) => {
      return `$$\n${decodeEntities(source).trim()}\n$$`;
    })
    .replace(/<math-inline>([\s\S]*?)<\/math-inline>/g, (_, source: string) => {
      return `$${decodeEntities(source).trim()}$`;
    })
    .replace(/\[([ xX])\]\s+&#x20;/g, "[$1] ");
  restored = restored.replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_match: string, source: string) => {
    return `$$\n${source.trim()}\n$$`;
  });
  return restored
    .replace(/[ \t]+\n/g, "\n")
    .replace(/([^\n$])\n{2,}\$\$/g, (_match: string, previous: string) => `${previous}\n$$`)
    .replace(/([^\s])[\t ]*\n?\$\$\n/g, (_match: string, previous: string) => {
      return `${previous}\n\n$$\n`;
    })
    .replace(/\$\$\s*([\s\S]*?)\s*\$\$/g, (_match: string, source: string) => {
      return `$$\n${source.trim()}\n$$`;
    });
}

function nodeText(node: HastNode): string {
  if (node.type === "text") return node.value;
  if (node.type !== "element") return "";
  return node.children.map(nodeText).join("");
}

function phrasingToText(nodes: PhrasingContent[]): string {
  return nodes
    .map((node) => {
      if (node.type === "text" || node.type === "inlineCode") return node.value;
      if (node.type === "image") return node.alt ?? "";
      if ("children" in node) return phrasingToText(node.children.filter(isPhrasingContent));
      return "";
    })
    .join("");
}

function isMarkdownDocument(value: unknown): value is MarkdownDocument {
  return Boolean(value && typeof value === "object" && "type" in value && value.type === "root");
}

function isRootContent(node: Content): node is RootContent {
  return [
    "blockquote",
    "break",
    "code",
    "definition",
    "delete",
    "emphasis",
    "footnoteDefinition",
    "heading",
    "html",
    "image",
    "imageReference",
    "inlineCode",
    "link",
    "linkReference",
    "list",
    "mdxFlowExpression",
    "mdxJsxFlowElement",
    "mdxJsxTextElement",
    "mdxTextExpression",
    "paragraph",
    "root",
    "strong",
    "table",
    "text",
    "thematicBreak",
    "yaml",
  ].includes(node.type);
}

function isBlockContent(node: Content): node is BlockContent {
  return [
    "blockquote",
    "code",
    "heading",
    "html",
    "list",
    "paragraph",
    "table",
    "thematicBreak",
  ].includes(node.type);
}

function isPhrasingContent(node: Content): node is PhrasingContent {
  return [
    "break",
    "delete",
    "emphasis",
    "footnoteReference",
    "html",
    "image",
    "imageReference",
    "inlineCode",
    "link",
    "linkReference",
    "strong",
    "text",
  ].includes(node.type);
}

function isKnownContainer(tagName: string): boolean {
  return ["article", "body", "div", "main", "section", "span"].includes(tagName);
}

function stringProperty(value: unknown): string {
  if (Array.isArray(value)) return value.map(String).join(" ");
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&");
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-") || "heading"
  );
}

function markUnused(_value: unknown): void {
  return;
}

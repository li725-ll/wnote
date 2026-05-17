import type { BlockNode, InlineNode } from "@wnote/md-parser";
import { processKatexInHtml } from "../enhancers/katex";

interface ParagraphBlockProps {
  node: Extract<BlockNode, { type: "paragraph" }>;
}

export function ParagraphBlock({ node }: ParagraphBlockProps) {
  const html = processKatexInHtml(inlinesToHtml(node.children));
  return <p dangerouslySetInnerHTML={{ __html: html }} />;
}

export function inlinesToHtml(nodes: InlineNode[]): string {
  let out = "";
  for (const node of nodes) {
    switch (node.type) {
      case "text":
        out += escapeHtml(node.value);
        break;
      case "strong":
        out += `<strong>${inlinesToHtml(node.children)}</strong>`;
        break;
      case "emphasis":
        out += `<em>${inlinesToHtml(node.children)}</em>`;
        break;
      case "strikethrough":
        out += `<del>${inlinesToHtml(node.children)}</del>`;
        break;
      case "code":
        out += `<code>${escapeHtml(node.value)}</code>`;
        break;
      case "link":
        out += `<a href="${escapeAttr(node.href)}">${inlinesToHtml(node.children)}</a>`;
        break;
      case "image":
        out += `<img src="${escapeAttr(node.src)}" alt="${escapeAttr(node.alt)}" />`;
        break;
      case "hardBreak":
        out += "<br>";
        break;
      case "softBreak":
        out += "\n";
        break;
      case "html":
        out += node.value;
        break;
    }
  }
  return out;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

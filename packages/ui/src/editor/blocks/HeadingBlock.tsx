import type { BlockNode } from "@wnote/md-parser";
import { inlinesToHtml } from "./ParagraphBlock";
import { processKatexInHtml } from "../enhancers/katex";

interface HeadingBlockProps {
  node: Extract<BlockNode, { type: "heading" }>;
}

export function HeadingBlock({ node }: HeadingBlockProps) {
  const Tag = `h${node.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  const html = processKatexInHtml(inlinesToHtml(node.children));
  return <Tag dangerouslySetInnerHTML={{ __html: html }} />;
}

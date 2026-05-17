import type { BlockNode } from "@wnote/md-parser";
import { inlinesToHtml } from "./ParagraphBlock";
import { processKatexInHtml } from "../enhancers/katex";

interface BlockquoteBlockProps {
  node: Extract<BlockNode, { type: "blockquote" }>;
}

export function BlockquoteBlock({ node }: BlockquoteBlockProps) {
  return (
    <blockquote
      style={{
        borderLeft: "3px solid var(--color-blockquote-border)",
        paddingLeft: "1em",
        margin: "0.5em 0",
        background: "var(--color-blockquote-bg)",
      }}
    >
      {node.children.map((child, i) => (
        <NestedBlock key={i} node={child} />
      ))}
    </blockquote>
  );
}

function NestedBlock({ node }: { node: BlockNode }) {
  if (node.type === "paragraph") {
    const html = processKatexInHtml(inlinesToHtml(node.children));
    return <p dangerouslySetInnerHTML={{ __html: html }} />;
  }
  if (node.type === "heading") {
    const Tag = `h${node.level}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    const html = processKatexInHtml(inlinesToHtml(node.children));
    return <Tag dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return <div>{node.raw}</div>;
}

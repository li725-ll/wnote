import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";

export interface HeadingItem {
  id: string;
  level: number;
  text: string;
  from: number;
}

export interface ParsedAtxHeading {
  level: number;
  text: string;
  markerEnd: number;
}

export function parseAtxHeadingLine(lineText: string): ParsedAtxHeading | null {
  const match = /^(#{1,6})([ \t]+)(.+?)\s*$/.exec(lineText);
  if (!match) return null;

  const text = match[3].replace(/[ \t]+#+\s*$/, "").trim();
  if (!text) return null;

  return {
    level: match[1].length,
    text,
    markerEnd: match[1].length + match[2].length,
  };
}

export function slugify(text: string): string {
  return (
    text
      .toLowerCase()
      .replace(/[^\w一-鿿]+/g, "-")
      .replace(/^-|-$/g, "") || "heading"
  );
}

export function extractHeadings(state: EditorState): HeadingItem[] {
  const headings: HeadingItem[] = [];
  const slugCount = new Map<string, number>();
  const codeLines = new Set<number>();

  syntaxTree(state).iterate({
    enter(node) {
      if (node.name !== "FencedCode") return;

      const startLine = state.doc.lineAt(node.from);
      const endLine = state.doc.lineAt(node.to);
      for (let i = startLine.number; i <= endLine.number; i++) {
        codeLines.add(i);
      }
    },
  });

  for (let i = 1; i <= state.doc.lines; i++) {
    if (codeLines.has(i)) continue;

    const line = state.doc.line(i);
    const heading = parseAtxHeadingLine(line.text);
    if (!heading) continue;

    const base = slugify(heading.text);
    const count = slugCount.get(base) || 0;
    slugCount.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count}`;

    headings.push({ id, level: heading.level, text: heading.text, from: line.from });
  }

  return headings;
}

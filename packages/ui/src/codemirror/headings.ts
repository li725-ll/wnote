import { syntaxTree } from "@codemirror/language";
import type { EditorState } from "@codemirror/state";

export interface HeadingItem {
  id: string;
  level: number;
  text: string;
  from: number;
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

  syntaxTree(state).iterate({
    enter(node) {
      const match = /^ATXHeading(\d)$/.exec(node.name);
      if (!match) return;

      const level = Number(match[1]);
      const lineText = state.doc.sliceString(node.from, node.to);
      const text = lineText.replace(/^#{1,6}\s+/, "").trim();

      if (!text) return;

      const base = slugify(text);
      const count = slugCount.get(base) || 0;
      slugCount.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count}`;

      headings.push({ id, level, text, from: node.from });
    },
  });

  return headings;
}

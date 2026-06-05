import { Extension } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin } from "@tiptap/pm/state";

export const MarkdownShortcuts = Extension.create({
  name: "markdownShortcuts",

  addProseMirrorPlugins() {
    const editor = this.editor;

    return [
      new Plugin({
        props: {
          handleTextInput(view, from, to, text) {
            if (text !== " ") return false;

            const line = lineBefore(view.state.doc, from);
            const command = blockCommand(line.text);
            if (!command) return false;

            view.dispatch(view.state.tr.delete(line.from, to));
            const chain = editor.chain().focus();

            switch (command.type) {
              case "heading":
                return chain.setNode("heading", { level: command.level }).run();
              case "blockquote":
                return chain.toggleBlockquote().run();
              case "bulletList":
                return chain.toggleBulletList().run();
              case "orderedList":
                return chain.toggleOrderedList().run();
              case "taskList":
                return chain.toggleTaskList().run();
              case "codeBlock":
                return command.language
                  ? chain.setCodeBlock({ language: command.language }).run()
                  : chain.setCodeBlock().run();
              case "mermaidBlock":
                return chain
                  .insertContent({ type: "mermaidBlock", attrs: { source: "graph TD\n  A --> B" } })
                  .run();
              case "blockMath":
                return chain.insertContent({ type: "blockMath", attrs: { formula: "" } }).run();
            }
          },

          handleKeyDown(view, event) {
            if (event.key !== "Enter") return false;

            const line = lineBefore(view.state.doc, view.state.selection.from);
            if (!isHorizontalRuleShortcut(line.text)) return false;

            event.preventDefault();
            view.dispatch(view.state.tr.delete(line.from, view.state.selection.from));
            return editor.chain().focus().setHorizontalRule().run();
          },
        },
      }),
    ];
  },
});

export type BlockCommand =
  | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6 }
  | { type: "blockquote" }
  | { type: "bulletList" }
  | { type: "orderedList" }
  | { type: "taskList" }
  | { type: "codeBlock"; language?: string }
  | { type: "mermaidBlock" }
  | { type: "blockMath" };

export function blockCommand(value: string): BlockCommand | null {
  const heading = /^(#{1,6})$/.exec(value);
  if (heading) return { type: "heading", level: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6 };
  if (value === ">") return { type: "blockquote" };
  if (/^[-*+]$/.test(value)) return { type: "bulletList" };
  if (/^\d+[.)]$/.test(value)) return { type: "orderedList" };
  if (/^(?:[-*+]\s+)?\[[ xX]\]$/.test(value)) return { type: "taskList" };

  const fence = /^```([A-Za-z0-9_-]+)?$/.exec(value);
  if (fence?.[1]?.toLowerCase() === "mermaid") return { type: "mermaidBlock" };
  if (fence) return { type: "codeBlock", language: fence[1] };
  if (value === "$$") return { type: "blockMath" };

  return null;
}

export function isHorizontalRuleShortcut(value: string): boolean {
  return /^\s*(?:---|\*\*\*|___)\s*$/.test(value);
}

function lineBefore(doc: ProseMirrorNode, pos: number) {
  const $pos = doc.resolve(pos);
  const from = $pos.start($pos.depth);
  return {
    from,
    text: doc.textBetween(from, pos, "\n", "\n"),
  };
}

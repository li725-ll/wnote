import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useState } from "react";
import styles from "./Math.module.css";

export const InlineMath = Node.create({
  name: "inlineMath",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      formula: {
        default: "",
        parseHTML: (element) =>
          element.getAttribute("data-math-inline") ?? element.textContent ?? "",
        renderHTML: (attributes) => ({ "data-math-inline": attributes.formula }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-math-inline]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes), HTMLAttributes["data-math-inline"] ?? ""];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathView);
  },
});

export const BlockMath = Node.create({
  name: "blockMath",
  group: "block",
  atom: true,
  selectable: true,
  defining: true,

  addAttributes() {
    return {
      formula: {
        default: "",
        parseHTML: (element) =>
          element.getAttribute("data-math-block") ?? element.textContent ?? "",
        renderHTML: (attributes) => ({ "data-math-block": attributes.formula }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-math-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), HTMLAttributes["data-math-block"] ?? ""];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathView);
  },
});

function MathView({ node, selected, updateAttributes }: NodeViewProps) {
  const isBlock = node.type.name === "blockMath";
  const formula = String(node.attrs.formula ?? "");
  const [editing, setEditing] = useState(!formula);
  const [html, setHtml] = useState("");

  useEffect(() => {
    let disposed = false;

    void import("@wnote/renderers/katex").then(({ renderBlockMath, renderInlineMath }) => {
      if (disposed) return;
      setHtml(isBlock ? renderBlockMath(formula) : renderInlineMath(formula));
    });

    return () => {
      disposed = true;
    };
  }, [formula, isBlock]);

  return (
    <NodeViewWrapper
      as={isBlock ? "div" : "span"}
      className={isBlock ? styles.block : styles.inline}
      data-selected={selected ? "true" : "false"}
      onClick={() => setEditing(true)}
    >
      {editing ? (
        <textarea
          className={isBlock ? styles.blockInput : styles.inlineInput}
          value={formula}
          rows={isBlock ? 3 : 1}
          spellCheck={false}
          autoFocus
          onChange={(event) => updateAttributes({ formula: event.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              setEditing(false);
            }
          }}
        />
      ) : (
        <span
          className={styles.rendered}
          contentEditable={false}
          dangerouslySetInnerHTML={{ __html: html || escapeHtml(formula) }}
        />
      )}
    </NodeViewWrapper>
  );
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

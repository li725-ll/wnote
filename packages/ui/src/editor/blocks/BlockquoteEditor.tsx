import { useRef, useEffect, useCallback } from "react";
import type { EditorBlock } from "../types";
import { useEditor } from "../context";
import { parseBlock } from "../../wasm/parser";
import { domToMarkdown } from "./domToMarkdown";
import type { BlockNode } from "@wnote/md-parser";
import { inlinesToHtml } from "./ParagraphBlock";
import styles from "./BlockquoteEditor.module.css";

interface BlockquoteEditorProps {
  block: EditorBlock;
}

export function BlockquoteEditor({ block }: BlockquoteEditorProps) {
  const { state, dispatch } = useEditor();
  const ref = useRef<HTMLDivElement>(null);
  const node = block.node as Extract<BlockNode, { type: "blockquote" }>;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = node.children
      .map((child) => {
        if (child.type === "paragraph") return `<p>${inlinesToHtml(child.children)}</p>`;
        return `<p>${child.raw}</p>`;
      })
      .join("");
    el.focus();
    if (state.focusDirection === "up" || state.focusDirection === "click") {
      placeCaretAtEnd(el);
    } else {
      placeCaretAtStart(el);
    }
  }, []);

  const handleBlur = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const content = domToMarkdown(el).trimEnd();
    const raw = content
      .split("\n")
      .map((line) => `> ${line}`)
      .join("\n");
    const parsed = parseBlock(raw) ?? { type: "blockquote" as const, children: [], raw };
    dispatch({ type: "UPDATE_BLOCK", id: block.id, node: parsed });
    dispatch({ type: "BLUR" });
  }, [block.id, dispatch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;

      if (e.key === "ArrowUp") {
        const sel = window.getSelection();
        if (sel && sel.isCollapsed && isAtStart(el, sel)) {
          e.preventDefault();
          dispatch({ type: "MOVE_FOCUS", direction: "up" });
          return;
        }
      }

      if (e.key === "ArrowDown") {
        const sel = window.getSelection();
        if (sel && sel.isCollapsed && isAtEnd(el, sel)) {
          e.preventDefault();
          dispatch({ type: "MOVE_FOCUS", direction: "down" });
          return;
        }
      }
    },
    [dispatch],
  );

  return (
    <blockquote className={styles.editor}>
      <div
        ref={ref}
        className={styles.content}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </blockquote>
  );
}

function placeCaretAtEnd(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(false);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function placeCaretAtStart(el: HTMLElement) {
  const range = document.createRange();
  range.selectNodeContents(el);
  range.collapse(true);
  const sel = window.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(range);
}

function isAtStart(el: HTMLElement, sel: Selection): boolean {
  const range = sel.getRangeAt(0);
  const preRange = document.createRange();
  preRange.setStart(el, 0);
  preRange.setEnd(range.startContainer, range.startOffset);
  return preRange.toString().length === 0;
}

function isAtEnd(el: HTMLElement, sel: Selection): boolean {
  const range = sel.getRangeAt(0);
  const postRange = document.createRange();
  postRange.setStart(range.endContainer, range.endOffset);
  postRange.setEnd(el, el.childNodes.length);
  return postRange.toString().length === 0;
}

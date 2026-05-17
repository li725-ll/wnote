import { useRef, useEffect, useCallback } from "react";
import type { EditorBlock } from "../types";
import { useEditor } from "../context";
import { parseBlock } from "../../wasm/parser";
import { inlinesToHtml } from "./ParagraphBlock";
import { domToMarkdown } from "./domToMarkdown";
import type { BlockNode } from "@wnote/md-parser";
import styles from "./ContentEditor.module.css";

interface HeadingEditorProps {
  block: EditorBlock;
}

export function HeadingEditor({ block }: HeadingEditorProps) {
  const { state, dispatch } = useEditor();
  const ref = useRef<HTMLDivElement>(null);
  const node = block.node as Extract<BlockNode, { type: "heading" }>;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = inlinesToHtml(node.children);
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
    const content = domToMarkdown(el).replace(/\n$/, "");
    const prefix = "#".repeat(node.level) + " ";
    const raw = prefix + content;
    const parsed = parseBlock(raw) ?? {
      type: "heading" as const,
      level: node.level,
      children: [],
      raw,
    };
    dispatch({ type: "UPDATE_BLOCK", id: block.id, node: parsed });
    dispatch({ type: "BLUR" });
  }, [block.id, node.level, dispatch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      const el = ref.current;
      if (!el) return;

      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const content = domToMarkdown(el).replace(/\n$/, "");
        const prefix = "#".repeat(node.level) + " ";
        const raw = prefix + content;
        const parsed = parseBlock(raw) ?? {
          type: "heading" as const,
          level: node.level,
          children: [],
          raw,
        };
        dispatch({ type: "UPDATE_BLOCK", id: block.id, node: parsed });

        const newBlock: EditorBlock = {
          id: crypto.randomUUID(),
          node: { type: "paragraph", children: [{ type: "text", value: "" }], raw: "" },
        };
        dispatch({ type: "INSERT_AFTER", afterId: block.id, block: newBlock });
        return;
      }

      if (e.key === "Backspace") {
        const sel = window.getSelection();
        if (sel && sel.isCollapsed && isAtStart(el, sel)) {
          if (el.textContent === "") {
            e.preventDefault();
            dispatch({ type: "DELETE_BLOCK", id: block.id });
            return;
          }
        }
      }

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
    [block.id, node.level, dispatch],
  );

  const headingClass = `${styles.content} ${styles[`h${node.level}`] ?? ""}`;

  return (
    <div
      ref={ref}
      className={headingClass}
      contentEditable
      suppressContentEditableWarning
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
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

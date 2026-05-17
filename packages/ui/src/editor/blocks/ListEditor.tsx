import { useRef, useEffect, useCallback } from "react";
import type { EditorBlock } from "../types";
import { useEditor } from "../context";
import { parseBlock } from "../../wasm/parser";
import type { BlockNode } from "@wnote/md-parser";
import styles from "./ListEditor.module.css";

type ListNode =
  | Extract<BlockNode, { type: "bulletList" }>
  | Extract<BlockNode, { type: "orderedList" }>;

interface ListEditorProps {
  block: EditorBlock;
}

export function ListEditor({ block }: ListEditorProps) {
  const { state, dispatch } = useEditor();
  const ref = useRef<HTMLDivElement>(null);
  const node = block.node as ListNode;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const items = node.items.map((item) => {
      const text = item.children.map((c) => (c.type === "paragraph" ? c.raw : c.raw)).join("\n");
      return text;
    });
    el.innerText = items.join("\n");
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
    const text = el.innerText.trimEnd();
    const lines = text.split("\n");
    let raw: string;
    if (node.type === "orderedList") {
      raw = lines.map((line, i) => `${i + 1}. ${line}`).join("\n");
    } else {
      raw = lines.map((line) => `- ${line}`).join("\n");
    }
    const parsed = parseBlock(raw) ?? { type: node.type as "bulletList", items: [], raw };
    dispatch({ type: "UPDATE_BLOCK", id: block.id, node: parsed });
    dispatch({ type: "BLUR" });
  }, [block.id, node.type, dispatch]);

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

  const isOrdered = node.type === "orderedList";

  return (
    <div className={`${styles.editor} ${isOrdered ? styles.ordered : styles.unordered}`}>
      <div
        ref={ref}
        className={styles.content}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
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

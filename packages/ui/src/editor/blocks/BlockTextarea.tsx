import { useRef, useEffect, useCallback } from "react";
import type { EditorBlock } from "../types";
import { useEditor } from "../context";
import { parseBlock } from "../../wasm/parser";
import styles from "./BlockTextarea.module.css";

interface BlockTextareaProps {
  block: EditorBlock;
}

export function BlockTextarea({ block }: BlockTextareaProps) {
  const { state, dispatch } = useEditor();
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.value = block.node.raw;
    adjustHeight(ta);
    ta.focus();
    if (state.focusDirection === "up") {
      ta.selectionStart = ta.selectionEnd = ta.value.length;
    } else if (state.focusDirection === "down") {
      ta.selectionStart = ta.selectionEnd = 0;
    }
  }, []);

  const adjustHeight = (ta: HTMLTextAreaElement) => {
    ta.style.height = "auto";
    ta.style.height = ta.scrollHeight + "px";
  };

  const handleInput = useCallback(() => {
    const ta = ref.current;
    if (ta) adjustHeight(ta);
  }, []);

  const handleBlur = useCallback(() => {
    const ta = ref.current;
    if (!ta) return;
    const raw = ta.value;
    const node = parseBlock(raw) ?? { type: "paragraph" as const, children: [], raw };
    dispatch({ type: "UPDATE_BLOCK", id: block.id, node });
    dispatch({ type: "BLUR" });
  }, [block.id, dispatch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = ref.current;
      if (!ta) return;

      if (e.key === "Enter" && !e.shiftKey && block.node.type !== "codeBlock") {
        e.preventDefault();
        const raw = ta.value;
        const pos = ta.selectionStart;
        const before = raw.slice(0, pos);
        const after = raw.slice(pos);

        const beforeNode = parseBlock(before) ?? {
          type: "paragraph" as const,
          children: [],
          raw: before,
        };
        dispatch({ type: "UPDATE_BLOCK", id: block.id, node: beforeNode });

        const afterNode = parseBlock(after) ?? {
          type: "paragraph" as const,
          children: [],
          raw: after,
        };
        const newBlock: EditorBlock = { id: crypto.randomUUID(), node: afterNode };
        dispatch({ type: "INSERT_AFTER", afterId: block.id, block: newBlock });
        return;
      }

      if (e.key === "Backspace") {
        if (ta.value === "") {
          e.preventDefault();
          dispatch({ type: "DELETE_BLOCK", id: block.id });
          return;
        }
        if (ta.selectionStart === 0 && ta.selectionEnd === 0) {
          e.preventDefault();
          const blocks = state.blocks;
          const idx = blocks.findIndex((b) => b.id === block.id);
          if (idx <= 0) return;
          const prev = blocks[idx - 1];
          const merged = prev.node.raw + "\n" + ta.value;
          const mergedNode = parseBlock(merged) ?? {
            type: "paragraph" as const,
            children: [],
            raw: merged,
          };
          dispatch({ type: "UPDATE_BLOCK", id: prev.id, node: mergedNode });
          dispatch({ type: "DELETE_BLOCK", id: block.id });
          return;
        }
      }

      if (e.key === "ArrowUp" && isOnFirstLine(ta)) {
        e.preventDefault();
        dispatch({ type: "MOVE_FOCUS", direction: "up" });
        return;
      }

      if (e.key === "ArrowDown" && isOnLastLine(ta)) {
        e.preventDefault();
        dispatch({ type: "MOVE_FOCUS", direction: "down" });
        return;
      }
    },
    [block.id, block.node.type, state.blocks, dispatch],
  );

  return (
    <textarea
      ref={ref}
      className={styles.textarea}
      onInput={handleInput}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder="Type something..."
      rows={1}
    />
  );
}

function isOnFirstLine(ta: HTMLTextAreaElement): boolean {
  const first = ta.value.indexOf("\n");
  return first === -1 || ta.selectionStart <= first;
}

function isOnLastLine(ta: HTMLTextAreaElement): boolean {
  const last = ta.value.lastIndexOf("\n");
  return last === -1 || ta.selectionStart > last;
}

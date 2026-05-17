import { useRef, useEffect, useCallback, useState } from "react";
import type { EditorBlock } from "../types";
import { useEditor } from "../context";
import { parseBlock } from "../../wasm/parser";
import { renderBlockMath } from "../enhancers/katex";
import styles from "./MathBlockEditor.module.css";

interface MathBlockEditorProps {
  block: EditorBlock;
}

export function MathBlockEditor({ block }: MathBlockEditorProps) {
  const { state, dispatch } = useEditor();
  const ref = useRef<HTMLTextAreaElement>(null);
  const node = block.node as Extract<typeof block.node, { type: "codeBlock" }>;
  const [preview, setPreview] = useState(() => renderBlockMath(node.code));

  useEffect(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.value = node.code;
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
    if (!ta) return;
    adjustHeight(ta);
    setPreview(renderBlockMath(ta.value));
  }, []);

  const handleBlur = useCallback(() => {
    const code = ref.current?.value ?? "";
    const lang = node.lang ?? "math";
    const raw = `\`\`\`${lang}\n${code}\n\`\`\``;
    const parsed = parseBlock(raw) ?? { type: "codeBlock" as const, lang, code, raw };
    dispatch({ type: "UPDATE_BLOCK", id: block.id, node: parsed });
    dispatch({ type: "BLUR" });
  }, [block.id, node.lang, dispatch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = ref.current;
      if (!ta) return;

      if (e.key === "Escape") {
        e.preventDefault();
        ta.blur();
        return;
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
    [dispatch],
  );

  return (
    <div className={styles.editor}>
      {preview && <div className={styles.preview} dangerouslySetInnerHTML={{ __html: preview }} />}
      <textarea
        ref={ref}
        className={styles.source}
        onInput={handleInput}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        placeholder="LaTeX..."
        rows={1}
      />
    </div>
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

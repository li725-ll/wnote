import { useRef, useEffect, useCallback, useState } from "react";
import type { EditorBlock } from "../types";
import { useEditor } from "../context";
import { parseBlock } from "../../wasm/parser";
import { CodeBlock } from "./CodeBlock";
import styles from "./CodeBlockEditor.module.css";

interface CodeBlockEditorProps {
  block: EditorBlock;
}

export function CodeBlockEditor({ block }: CodeBlockEditorProps) {
  const { state, dispatch } = useEditor();
  const codeRef = useRef<HTMLTextAreaElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const node = block.node as Extract<typeof block.node, { type: "codeBlock" }>;
  const [liveNode, setLiveNode] = useState(node);
  const [taStyle, setTaStyle] = useState<React.CSSProperties>({ top: 0, left: 0 });

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const pre = wrap.querySelector("pre");
    if (!pre) return;
    const wrapRect = wrap.getBoundingClientRect();
    const preRect = pre.getBoundingClientRect();
    const cs = getComputedStyle(pre);
    setTaStyle({
      top: preRect.top - wrapRect.top,
      left: preRect.left - wrapRect.left,
      width: preRect.width,
      height: preRect.height,
      padding: cs.padding,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
    });
  }, []);

  useEffect(() => {
    const ta = codeRef.current;
    if (!ta) return;
    ta.value = node.code;
    ta.focus();
    if (state.focusDirection === "up") {
      ta.selectionStart = ta.selectionEnd = ta.value.length;
    } else if (state.focusDirection === "down") {
      ta.selectionStart = ta.selectionEnd = 0;
    }
  }, []);

  const handleInput = useCallback(() => {
    const ta = codeRef.current;
    if (ta) {
      setLiveNode((prev) => ({ ...prev, code: ta.value }));
    }
  }, []);

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      const wrapper = e.currentTarget.closest("[data-focused]");
      if (wrapper?.contains(e.relatedTarget as Node)) return;

      const code = codeRef.current?.value ?? "";
      const lang = node.lang ?? "";
      const fence = "```";
      const trimmed = code.endsWith("\n") ? code.slice(0, -1) : code;
      const raw = `${fence}${lang}\n${trimmed}\n${fence}`;
      const parsed = parseBlock(raw) ?? { type: "codeBlock" as const, lang, code, raw };
      dispatch({ type: "UPDATE_BLOCK", id: block.id, node: parsed });
      dispatch({ type: "BLUR" });
    },
    [block.id, node.lang, dispatch],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const ta = codeRef.current;
      if (!ta) return;

      if (e.key === "Escape") {
        e.preventDefault();
        ta.blur();
        return;
      }

      if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
        const val = ta.value;
        const atEnd = ta.selectionStart === val.length;
        if (atEnd && val.endsWith("\n")) {
          e.preventDefault();
          const code = val.slice(0, -1);
          const lang = node.lang ?? "";
          const fence = "```";
          const raw = `${fence}${lang}\n${code}\n${fence}`;
          const parsed = parseBlock(raw) ?? { type: "codeBlock" as const, lang, code, raw };
          dispatch({ type: "UPDATE_BLOCK", id: block.id, node: parsed });
          const newBlock: EditorBlock = {
            id: crypto.randomUUID(),
            node: { type: "paragraph", children: [], raw: "" },
          };
          dispatch({ type: "INSERT_AFTER", afterId: block.id, block: newBlock });
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
    [block.id, node.lang, dispatch],
  );

  return (
    <div ref={wrapRef} className={styles.editor} onBlur={handleBlur}>
      <CodeBlock node={liveNode} />
      <textarea
        ref={codeRef}
        className={styles.textarea}
        style={taStyle}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        spellCheck={false}
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

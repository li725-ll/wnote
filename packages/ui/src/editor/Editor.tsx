import { useReducer, useEffect, useCallback, useRef } from "react";
import type { EditorProps, EditorBlock } from "./types";
import { editorReducer, initialState } from "./reducer";
import { EditorContext } from "./context";
import { parse } from "../wasm/parser";
import { BlockWrapper } from "./blocks/BlockWrapper";
import { StatusBar } from "./blocks/StatusBar";
import "../styles/variables.css";
import styles from "./Editor.module.css";

export function Editor({ initialContent = "", onChange }: EditorProps) {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const doc = parse(initialContent);
    const blocks: EditorBlock[] = doc.children.map((node) => ({
      id: crypto.randomUUID(),
      node,
    }));
    if (blocks.length === 0) {
      blocks.push({
        id: crypto.randomUUID(),
        node: { type: "paragraph", children: [], raw: "" },
      });
    }
    dispatch({ type: "INIT", blocks });
  }, [initialContent]);

  useEffect(() => {
    if (onChangeRef.current && state.blocks.length > 0) {
      const md = state.blocks.map((b) => b.node.raw).join("\n\n");
      onChangeRef.current(md);
    }
  }, [state.blocks]);

  const handleContainerClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && state.blocks.length > 0) {
        const lastBlock = state.blocks[state.blocks.length - 1];
        dispatch({ type: "FOCUS", id: lastBlock.id, direction: "click" });
      }
    },
    [state.blocks],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    dispatch({ type: "SET_THEME", theme: mq.matches ? "dark" : "light" });
    const handler = (e: MediaQueryListEvent) => {
      dispatch({ type: "SET_THEME", theme: e.matches ? "dark" : "light" });
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return (
    <EditorContext.Provider value={{ state, dispatch }}>
      <div className={styles.editor} data-theme={state.theme} onClick={handleContainerClick}>
        <StatusBar />
        {state.blocks.map((block) => (
          <BlockWrapper key={block.id} block={block} isFocused={state.focusedId === block.id} />
        ))}
      </div>
    </EditorContext.Provider>
  );
}

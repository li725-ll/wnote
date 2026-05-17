import { useMemo } from "react";
import { useEditor } from "../context";
import styles from "./StatusBar.module.css";

export function StatusBar() {
  const { state, dispatch } = useEditor();

  const wordCount = useMemo(() => {
    const text = state.blocks.map((b) => b.node.raw).join("\n");
    const chars = text.replace(/\s/g, "").length;
    return chars;
  }, [state.blocks]);

  const toggle = () => {
    dispatch({
      type: "SET_MODE",
      mode: state.mode === "wysiwyg" ? "source" : "wysiwyg",
    });
  };

  return (
    <div className={styles.bar}>
      <span className={styles.count}>{wordCount} 字</span>
      <button className={styles.toggle} onClick={toggle}>
        {state.mode === "wysiwyg" ? "源码" : "预览"}
      </button>
    </div>
  );
}

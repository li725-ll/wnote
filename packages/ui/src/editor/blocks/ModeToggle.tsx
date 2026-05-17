import { useEditor } from "../context";
import styles from "./ModeToggle.module.css";

export function ModeToggle() {
  const { state, dispatch } = useEditor();

  const toggle = () => {
    dispatch({
      type: "SET_MODE",
      mode: state.mode === "wysiwyg" ? "source" : "wysiwyg",
    });
  };

  return (
    <button
      className={styles.toggle}
      onClick={toggle}
      title={state.mode === "wysiwyg" ? "切换到源码模式" : "切换到所见即所得模式"}
    >
      {state.mode === "wysiwyg" ? "源码" : "预览"}
    </button>
  );
}

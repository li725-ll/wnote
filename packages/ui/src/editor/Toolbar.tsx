import styles from "./Toolbar.module.css";

export function Toolbar() {
  return (
    <div className={styles.toolbar} role="toolbar" aria-label="Formatting">
      <button className={styles.btn} title="Bold" aria-label="Bold">
        <strong>B</strong>
      </button>
      <button className={styles.btn} title="Italic" aria-label="Italic">
        <em>I</em>
      </button>
      <button className={styles.btn} title="Strikethrough" aria-label="Strikethrough">
        <s>S</s>
      </button>
      <button className={styles.btn} title="Code" aria-label="Inline code">
        {"<>"}
      </button>
    </div>
  );
}

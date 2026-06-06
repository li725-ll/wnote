import type { HeadingItem } from "@wnote/editor-react";
import styles from "./FileTree.module.css";

interface DocumentOutlineProps {
  headings: HeadingItem[];
  onHeadingClick?: (heading: HeadingItem) => void;
}

export function DocumentOutline({ headings, onHeadingClick }: DocumentOutlineProps) {
  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.heading}>文档大纲</span>
      </div>
      {headings.length === 0 ? (
        <p className={styles.empty}>暂无标题</p>
      ) : (
        <ul className={styles.list}>
          {headings.map((h) => (
            <li key={`${h.id}-${h.from}`}>
              <button
                className={styles.item}
                style={{ paddingLeft: `${(h.level - 1) * 12 + 8}px` }}
                onClick={() => onHeadingClick?.(h)}
              >
                <span className={styles.level}>H{h.level}</span>
                <span className={styles.text}>{h.text}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

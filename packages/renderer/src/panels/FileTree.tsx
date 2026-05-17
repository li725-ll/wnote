import { useTranslation } from "react-i18next";
import type { HeadingItem } from "@wnote/ui";
import styles from "./FileTree.module.css";

interface DocumentOutlineProps {
  headings: HeadingItem[];
  onHeadingClick?: (heading: HeadingItem) => void;
}

export function DocumentOutline({ headings, onHeadingClick }: DocumentOutlineProps) {
  const { t } = useTranslation();

  return (
    <div className={styles.root}>
      <div className={styles.header}>
        <span className={styles.heading}>{t("outline.title")}</span>
      </div>
      {headings.length === 0 ? (
        <p className={styles.empty}>{t("outline.empty")}</p>
      ) : (
        <ul className={styles.list}>
          {headings.map((h, i) => (
            <li key={`${h.id}-${i}`}>
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

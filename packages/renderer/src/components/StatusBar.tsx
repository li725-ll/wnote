import { useMemo } from "react";
import { documentStats } from "../files/document-stats";
import styles from "./StatusBar.module.css";

interface StatusBarProps {
  content: string;
  dirty: boolean;
  path: string | null;
}

const numberFormatter = new Intl.NumberFormat();

export function StatusBar({ content, dirty, path }: StatusBarProps) {
  const stats = useMemo(() => documentStats(content), [content]);
  const saveState = dirty ? "未保存" : "已保存";
  const fileState = path ? "Markdown" : "草稿";

  return (
    <footer className={styles.statusBar} aria-label="文档状态">
      <div className={styles.group}>
        <span>{saveState}</span>
        <span>{fileState}</span>
      </div>
      <div className={styles.group}>
        <span>{numberFormatter.format(stats.words)} 字</span>
        <span>{numberFormatter.format(stats.characters)} 字符</span>
        <span>{numberFormatter.format(stats.lines)} 行</span>
      </div>
    </footer>
  );
}

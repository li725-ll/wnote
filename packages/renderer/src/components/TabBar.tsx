import { type DocumentTab } from "../hooks/useTabs";
import styles from "./TabBar.module.css";

interface TabBarProps {
  tabs: DocumentTab[];
  activeTabId: string;
  onSwitch: (id: string) => void;
  onClose: (id: string) => void;
  onNew: () => void;
}

function getTabTitle(tab: DocumentTab): string {
  if (tab.path) {
    const parts = tab.path.split(/[/\\]/);
    return parts[parts.length - 1];
  }
  return "未命名";
}

export function TabBar({ tabs, activeTabId, onSwitch, onClose, onNew }: TabBarProps) {
  return (
    <div className={styles.tabBar}>
      <div className={styles.tabs}>
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`${styles.tab} ${tab.id === activeTabId ? styles.active : ""}`}
            onClick={() => onSwitch(tab.id)}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                onClose(tab.id);
              }
            }}
          >
            <span className={styles.title}>{getTabTitle(tab)}</span>
            {tab.dirty && <span className={styles.dot} />}
            <button
              className={styles.close}
              onClick={(e) => {
                e.stopPropagation();
                onClose(tab.id);
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button className={styles.newBtn} onClick={onNew}>
        +
      </button>
    </div>
  );
}

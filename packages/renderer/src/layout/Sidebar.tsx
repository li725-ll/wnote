import { type ReactNode } from "react";
import styles from "./Sidebar.module.css";

interface SidebarProps {
  side: "left" | "right";
  children: ReactNode;
}

export function Sidebar({ side, children }: SidebarProps) {
  return (
    <aside className={styles.sidebar} data-side={side}>
      <div className={styles.content}>{children}</div>
    </aside>
  );
}

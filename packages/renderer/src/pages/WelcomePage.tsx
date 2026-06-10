import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { IpcChannel, type RecentWorkspaceEntry } from "@wnote/contracts";
import styles from "./WelcomePage.module.css";

interface WelcomePageProps {
  onStart: () => void;
  onOpenWorkspacePath?: (path: string) => void;
}

export function WelcomePage({ onStart, onOpenWorkspacePath }: WelcomePageProps) {
  const { t } = useTranslation();
  const [recentWorkspaces, setRecentWorkspaces] = useState<RecentWorkspaceEntry[]>([]);

  useEffect(() => {
    void window.electronAPI
      .invoke<RecentWorkspaceEntry[]>(IpcChannel.RecentWorkspacesGet)
      .then(setRecentWorkspaces);
  }, []);

  return (
    <div className={styles.root}>
      <div className={styles.card}>
        <div className={styles.icon}>✦</div>
        <h1 className={styles.title}>WNote</h1>
        <p className={styles.subtitle}>{t("welcome.subtitle")}</p>
        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>📝</span>
            <span>{t("welcome.feature1")}</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🤖</span>
            <span>{t("welcome.feature2")}</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>🎨</span>
            <span>{t("welcome.feature3")}</span>
          </div>
        </div>
        <button className={styles.startBtn} onClick={onStart}>
          {t("welcome.start")}
        </button>
        {recentWorkspaces.length > 0 ? (
          <div className={styles.recent} aria-label="最近工作区">
            <span className={styles.recentTitle}>最近工作区</span>
            {recentWorkspaces.map((workspace) => (
              <button
                key={workspace.path}
                className={styles.recentItem}
                type="button"
                title={workspace.path}
                onClick={() => onOpenWorkspacePath?.(workspace.path)}
              >
                {workspace.path.split(/[/\\]/).pop() || workspace.path}
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

import { useTranslation } from "react-i18next";
import styles from "./WelcomePage.module.css";

interface WelcomePageProps {
  onStart: () => void;
}

export function WelcomePage({ onStart }: WelcomePageProps) {
  const { t } = useTranslation();

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
      </div>
    </div>
  );
}

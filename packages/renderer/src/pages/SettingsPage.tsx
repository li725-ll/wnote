import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { type AppSettings } from "@wnote/contracts";
import { useSettingsStore } from "../stores/settings-store";
import styles from "./SettingsPage.module.css";

type Section = "general" | "update" | "about";

interface SettingsPageProps {
  onBack: () => void;
  onThemeChange?: (v: "light" | "dark" | "system") => void;
}

function GeneralSection({
  locale,
  theme,
  onLocaleChange,
  onThemeChange,
}: {
  locale: "zh" | "en";
  theme: "light" | "dark" | "system";
  onLocaleChange: (v: "zh" | "en") => void;
  onThemeChange: (v: "light" | "dark" | "system") => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <h2 className={styles.sectionTitle}>{t("settings.general")}</h2>
      <div className={styles.settingRow}>
        <div>
          <div className={styles.settingLabel}>{t("settings.language")}</div>
          <div className={styles.settingDesc}>{t("settings.languageDesc")}</div>
        </div>
        <select
          className={styles.select}
          value={locale}
          onChange={(e) => onLocaleChange(e.target.value as "zh" | "en")}
        >
          <option value="zh">中文</option>
          <option value="en">English</option>
        </select>
      </div>
      <div className={styles.settingRow}>
        <div>
          <div className={styles.settingLabel}>{t("settings.theme")}</div>
          <div className={styles.settingDesc}>{t("settings.themeDesc")}</div>
        </div>
        <select
          className={styles.select}
          value={theme}
          onChange={(e) => onThemeChange(e.target.value as "light" | "dark" | "system")}
        >
          <option value="light">{t("settings.themeLight")}</option>
          <option value="dark">{t("settings.themeDark")}</option>
          <option value="system">{t("settings.themeSystem")}</option>
        </select>
      </div>
    </>
  );
}

function UpdateSection({
  autoUpdate,
  onAutoUpdateChange,
}: {
  autoUpdate: boolean;
  onAutoUpdateChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  return (
    <>
      <h2 className={styles.sectionTitle}>{t("settings.update")}</h2>
      <div className={styles.settingRow}>
        <div>
          <div className={styles.settingLabel}>{t("settings.autoUpdate")}</div>
          <div className={styles.settingDesc}>{t("settings.autoUpdateDesc")}</div>
        </div>
        <button
          className={autoUpdate ? styles.toggleOn : styles.toggle}
          onClick={() => onAutoUpdateChange(!autoUpdate)}
        />
      </div>
      <div className={styles.settingRow}>
        <div>
          <div className={styles.settingLabel}>{t("settings.checkUpdate")}</div>
          <div className={styles.settingDesc}>{t("settings.checkUpdateDesc")}</div>
        </div>
        <button className={styles.btn}>{t("settings.checkUpdate")}</button>
      </div>
    </>
  );
}

function AboutSection() {
  const { t } = useTranslation();
  return (
    <>
      <h2 className={styles.sectionTitle}>{t("settings.about")}</h2>
      <div className={styles.settingRow}>
        <div className={styles.settingLabel}>{t("settings.version")}</div>
        <span className={styles.version}>0.0.1</span>
      </div>
      <div className={styles.settingRow}>
        <div className={styles.settingLabel}>{t("settings.sourceCode")}</div>
        <span className={styles.version}>github.com/wnote</span>
      </div>
    </>
  );
}

export function SettingsPage({ onBack, onThemeChange }: SettingsPageProps) {
  const { t, i18n } = useTranslation();
  const settings = useSettingsStore((state) => state.settings);
  const loadSettings = useSettingsStore((state) => state.loadSettings);
  const updateSettings = useSettingsStore((state) => state.updateSettings);
  const [section, setSection] = useState<Section>("general");

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleLocaleChange = (v: "zh" | "en") => {
    void updateSettings({ locale: v });
    i18n.changeLanguage(v);
  };

  const handleThemeChange = (v: "light" | "dark" | "system") => {
    void updateSettings({ theme: v });
    onThemeChange?.(v);
  };

  const handleAutoUpdateChange = (v: boolean) => {
    void updateSettings({ autoUpdate: v });
  };

  return (
    <div className={styles.root}>
      <nav className={styles.sidebar}>
        <button className={styles.backBtn} onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
            <path d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0z" />
          </svg>
          {t("settings.back")}
        </button>
        <button
          className={section === "general" ? styles.navItemActive : styles.navItem}
          onClick={() => setSection("general")}
        >
          {t("settings.general")}
        </button>
        <button
          className={section === "update" ? styles.navItemActive : styles.navItem}
          onClick={() => setSection("update")}
        >
          {t("settings.update")}
        </button>
        <button
          className={section === "about" ? styles.navItemActive : styles.navItem}
          onClick={() => setSection("about")}
        >
          {t("settings.about")}
        </button>
      </nav>

      <div className={styles.content}>
        {section === "general" && (
          <GeneralSection
            locale={settings.locale}
            theme={settings.theme}
            onLocaleChange={handleLocaleChange}
            onThemeChange={handleThemeChange}
          />
        )}
        {section === "update" && (
          <UpdateSection
            autoUpdate={settings.autoUpdate}
            onAutoUpdateChange={handleAutoUpdateChange}
          />
        )}
        {section === "about" && <AboutSection />}
      </div>
    </div>
  );
}

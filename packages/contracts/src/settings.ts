export interface AppSettings {
  locale: "zh" | "en";
  theme: "light" | "dark" | "system";
  autoUpdate: boolean;
  autoSave: boolean;
}

export const defaultSettings: AppSettings = {
  locale: "zh",
  theme: "light",
  autoUpdate: true,
  autoSave: true,
};

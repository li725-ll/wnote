import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zh from "./locales/zh.json";
import en from "./locales/en.json";

export async function initI18n(locale: "zh" | "en") {
  await i18n.use(initReactI18next).init({
    resources: {
      zh: { translation: zh },
      en: { translation: en },
    },
    lng: locale,
    fallbackLng: "zh",
    interpolation: { escapeValue: false },
  });
  return i18n;
}

export default i18n;

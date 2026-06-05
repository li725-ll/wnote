import React from "react";
import ReactDOM from "react-dom/client";
import "./global.css";
import App from "./App";
import { IpcChannel, type AppSettings } from "@wnote/contracts";
import { initI18n } from "./i18n";

async function bootstrap() {
  const settings = (await window.electronAPI.invoke(IpcChannel.SettingsGet)) as AppSettings;

  const resolved =
    settings.theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : settings.theme;
  document.documentElement.setAttribute("data-theme", resolved);

  await initI18n(settings.locale);

  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}

bootstrap();

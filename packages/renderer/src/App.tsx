import { lazy, Suspense, useCallback, useEffect } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import styles from "./App.module.css";
import { TitleBar } from "./components/TitleBar";
import { useNavigationIpc } from "./hooks/useNavigationIpc";
import { useWorkspaceStore } from "./stores/workspace-store";
import { useTheme } from "./hooks/useTheme";
import { useAppSettingsSync } from "./hooks/useAppSettingsSync";

const STORAGE_KEY = "wnote:welcomed";

const WelcomePage = lazy(() =>
  import("./pages/WelcomePage").then((module) => ({ default: module.WelcomePage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })),
);
const EditorPage = lazy(() =>
  import("./pages/EditorPage").then((module) => ({ default: module.EditorPage })),
);

function DefaultRoute() {
  const welcomed = localStorage.getItem(STORAGE_KEY);
  return <Navigate to={welcomed ? "/editor" : "/welcome"} replace />;
}

function WelcomeRoute() {
  const navigate = useNavigate();
  const openWorkspacePath = useWorkspaceStore((state) => state.openWorkspacePath);

  const enterEditor = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    navigate("/editor");
  }, [navigate]);

  return (
    <div className={styles.shell}>
      <TitleBar title="欢迎" />
      <div className={styles.content}>
        <Suspense fallback={null}>
          <WelcomePage
            onStart={enterEditor}
            onOpenWorkspacePath={(path) => {
              void openWorkspacePath(path).then(() => enterEditor());
            }}
          />
        </Suspense>
      </div>
    </div>
  );
}

function SettingsRoute() {
  const navigate = useNavigate();

  return (
    <div className={styles.shell}>
      <TitleBar title="设置" />
      <div className={styles.content}>
        <Suspense fallback={null}>
          <SettingsPage onBack={() => navigate("/editor")} />
        </Suspense>
      </div>
    </div>
  );
}

function NavigationIpcBridge() {
  const navigate = useNavigate();

  const handleNavigate = useCallback(
    (page: string) => {
      if (page === "settings") navigate("/settings");
    },
    [navigate],
  );
  useNavigationIpc(handleNavigate);
  return null;
}

export default function App() {
  useTheme();
  useAppSettingsSync({
    onAutoSaveChange: () => undefined,
    onThemeChange: () => undefined,
  });

  useEffect(() => {
    document.body.dataset.router = "hash";
  }, []);

  return (
    <>
      <NavigationIpcBridge />
      <Routes>
        <Route path="/" element={<DefaultRoute />} />
        <Route path="/welcome" element={<WelcomeRoute />} />
        <Route
          path="/editor"
          element={
            <Suspense fallback={null}>
              <EditorPage />
            </Suspense>
          }
        />
        <Route path="/settings" element={<SettingsRoute />} />
        <Route path="*" element={<DefaultRoute />} />
      </Routes>
    </>
  );
}

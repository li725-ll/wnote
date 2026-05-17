import { useEffect, useRef, useState, useCallback } from "react";
import { Editor, formatCommands } from "@wnote/ui";
import type { EditorRef, HeadingItem } from "@wnote/ui";
import { IpcChannel, type AppSettings } from "@wnote/shared";
import { AppLayout } from "./layout/AppLayout";
import { DocumentOutline } from "./panels/FileTree";
import { SettingsPage } from "./pages/SettingsPage";
import { WelcomePage } from "./pages/WelcomePage";
import { useTheme } from "./hooks/useTheme";
import { useTabs } from "./hooks/useTabs";
import { TabBar } from "./components/TabBar";

const STORAGE_KEY = "wnote:welcomed";

export default function App() {
  const [view, setView] = useState<"welcome" | "editor" | "settings">(() => {
    return localStorage.getItem(STORAGE_KEY) ? "editor" : "welcome";
  });
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const editorRef = useRef<EditorRef>(null);
  const { setTheme } = useTheme();
  const [autoSave, setAutoSave] = useState(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoSaveRef = useRef(autoSave);
  autoSaveRef.current = autoSave;

  const {
    tabs,
    activeTab,
    activeTabId,
    newTab,
    closeTab,
    switchTab,
    updateContent,
    openFile,
    markSaved,
    setContentSnapshot,
  } = useTabs();

  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const openFileRef = useRef(openFile);
  openFileRef.current = openFile;
  const newTabRef = useRef(newTab);
  newTabRef.current = newTab;
  const closeTabRef = useRef(closeTab);
  closeTabRef.current = closeTab;
  const activeTabIdRef = useRef(activeTabId);
  activeTabIdRef.current = activeTabId;
  const markSavedRef = useRef(markSaved);
  markSavedRef.current = markSaved;
  useEffect(() => {
    setContentSnapshot(() => editorRef.current?.getContent() ?? "");
  }, [setContentSnapshot]);

  useEffect(() => {
    window.electronAPI.invoke<AppSettings>(IpcChannel.SettingsGet).then((s) => {
      setAutoSave(s.autoSave);
    });
  }, []);

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const s = args[0] as AppSettings;
      setAutoSave(s.autoSave);
      setTheme(s.theme);
    };
    window.electronAPI.on(IpcChannel.SettingsChanged, handler);
    return () => window.electronAPI.off(IpcChannel.SettingsChanged, handler);
  }, [setTheme]);

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const page = args[0] as string;
      if (page === "settings") setView("settings");
    };
    window.electronAPI.on(IpcChannel.Navigate, handler);
    return () => window.electronAPI.off(IpcChannel.Navigate, handler);
  }, []);

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const data = args[0] as { filePath: string; name: string; content: string };
      openFileRef.current(data.filePath, data.content);
    };
    window.electronAPI.on(IpcChannel.FileOpened, handler);
    return () => window.electronAPI.off(IpcChannel.FileOpened, handler);
  }, []);

  useEffect(() => {
    const handler = () => newTabRef.current();
    window.electronAPI.on(IpcChannel.FileNew, handler);
    return () => window.electronAPI.off(IpcChannel.FileNew, handler);
  }, []);

  useEffect(() => {
    const handler = () => closeTabRef.current(activeTabIdRef.current);
    window.electronAPI.on(IpcChannel.FileClose, handler);
    return () => window.electronAPI.off(IpcChannel.FileClose, handler);
  }, []);

  useEffect(() => {
    window.electronAPI.invoke<{ filePath: string; name: string; content: string } | null>(
      IpcChannel.LastOpenedFileGet,
    ).then((data) => {
      if (data) openFileRef.current(data.filePath, data.content);
    });
  }, []);

  useEffect(() => {
    if (activeTab) {
      editorRef.current?.setContent(activeTab.content);
      const title = activeTab.path
        ? activeTab.path.split(/[/\\]/).pop() ?? "WNote"
        : "未命名";
      window.electronAPI.send(IpcChannel.WindowTitleSet, title);
    }
  }, [activeTabId]); // eslint-disable-line

  const handleSave = useCallback(
    async (saveAs = false) => {
      const tab = activeTabRef.current;
      const content = editorRef.current?.getContent() ?? tab.content;
      const result = await window.electronAPI.invoke<{ filePath: string; name: string } | null>(
        IpcChannel.FileSave,
        {
          filePath: saveAs ? undefined : tab.path,
          content,
          defaultName: tab.path?.split(/[/\\]/).pop() ?? "untitled.md",
        },
      );
      if (result) {
        markSavedRef.current(result.filePath);
        window.electronAPI.send(IpcChannel.WindowTitleSet, result.name);
      }
    },
    [],
  );

  useEffect(() => {
    const handler = () => handleSave(false);
    window.electronAPI.on(IpcChannel.FileSaveTrigger, handler);
    return () => window.electronAPI.off(IpcChannel.FileSaveTrigger, handler);
  }, [handleSave]);

  useEffect(() => {
    const handler = () => handleSave(true);
    window.electronAPI.on(IpcChannel.FileSaveAsTrigger, handler);
    return () => window.electronAPI.off(IpcChannel.FileSaveAsTrigger, handler);
  }, [handleSave]);
  // Format commands from menu
  useEffect(() => {
    const formatMap = {
      [IpcChannel.FormatBold]: formatCommands.bold,
      [IpcChannel.FormatItalic]: formatCommands.italic,
      [IpcChannel.FormatStrikethrough]: formatCommands.strikethrough,
      [IpcChannel.FormatInlineCode]: formatCommands.inlineCode,
      [IpcChannel.FormatMath]: formatCommands.math,
      [IpcChannel.FormatLink]: formatCommands.link,
      [IpcChannel.FormatImage]: formatCommands.image,
      [IpcChannel.FormatCodeBlock]: formatCommands.codeBlock,
      [IpcChannel.FormatBlockquote]: formatCommands.blockquote,
      [IpcChannel.FormatUnorderedList]: formatCommands.unorderedList,
      [IpcChannel.FormatOrderedList]: formatCommands.orderedList,
      [IpcChannel.FormatTaskList]: formatCommands.taskList,
      [IpcChannel.FormatHorizontalRule]: formatCommands.horizontalRule,
      [IpcChannel.FormatHeading1]: formatCommands.heading1,
      [IpcChannel.FormatHeading2]: formatCommands.heading2,
      [IpcChannel.FormatHeading3]: formatCommands.heading3,
      [IpcChannel.FormatHeading4]: formatCommands.heading4,
      [IpcChannel.FormatHeadingClear]: formatCommands.headingClear,
    };
    const handlers: [string, () => void][] = Object.entries(formatMap).map(([ch, fn]) => {
      const handler = () => {
        const view = editorRef.current?.getView();
        if (view) fn(view);
      };
      window.electronAPI.on(ch as IpcChannel, handler);
      return [ch, handler];
    });
    return () => {
      for (const [ch, handler] of handlers) {
        window.electronAPI.off(ch as IpcChannel, handler);
      }
    };
  }, []);

  // Auto-save
  const handleChange = useCallback(
    (content: string) => {
      updateContent(content);
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      if (autoSaveRef.current && activeTabRef.current.path) {
        autoSaveTimerRef.current = setTimeout(() => {
          handleSave(false);
        }, 2000);
      }
    },
    [updateContent, handleSave],
  );

  const handleNewTab = useCallback(() => {
    newTab();
  }, [newTab]);

  const handleImageSave = useCallback(async (file: File) => {
    const buffer = await file.arrayBuffer();
    const ext = file.name.split(".").pop() || "png";
    return window.electronAPI.invoke<string | null>(IpcChannel.ImageSave, { buffer, ext });
  }, []);

  const handleSwitchTab = useCallback(
    (id: string) => {
      switchTab(id);
    },
    [switchTab],
  );

  const handleCloseTab = useCallback((id: string) => {
    closeTabRef.current(id);
  }, []);

  const handleWelcomeStart = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setView("editor");
  };

  if (view === "welcome") {
    return <WelcomePage onStart={handleWelcomeStart} />;
  }

  if (view === "settings") {
    return <SettingsPage onBack={() => setView("editor")} onThemeChange={setTheme} />;
  }

  return (
    <AppLayout
      left={
        <DocumentOutline
          headings={headings}
          onHeadingClick={(h) => editorRef.current?.scrollToPos(h.from)}
        />
      }
      center={
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSwitch={handleSwitchTab}
            onClose={handleCloseTab}
            onNew={handleNewTab}
          />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <Editor
              ref={editorRef}
              onHeadingsChange={setHeadings}
              onChange={handleChange}
              onImageSave={handleImageSave}
            />
          </div>
        </div>
      }
    />
  );
}

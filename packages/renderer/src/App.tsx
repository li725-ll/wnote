import { useEffect, useRef, useState, useCallback, useMemo } from "react";
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
import { CommandPalette, type PaletteCommand } from "./components/CommandPalette";

const STORAGE_KEY = "wnote:welcomed";

export default function App() {
  const [view, setView] = useState<"welcome" | "editor" | "settings">(() => {
    return localStorage.getItem(STORAGE_KEY) ? "editor" : "welcome";
  });
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toggleOutlineSignal, setToggleOutlineSignal] = useState(0);
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
      const tabId = openFileRef.current(data.filePath, data.content);
      if (tabId === activeTabIdRef.current) {
        editorRef.current?.setContent(data.content);
        window.electronAPI.send(IpcChannel.WindowTitleSet, data.name);
      }
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
    window.electronAPI
      .invoke<{
        filePath: string;
        name: string;
        content: string;
      } | null>(IpcChannel.LastOpenedFileGet)
      .then((data) => {
        if (!data) return;
        const tabId = openFileRef.current(data.filePath, data.content);
        if (tabId === activeTabIdRef.current) {
          editorRef.current?.setContent(data.content);
          window.electronAPI.send(IpcChannel.WindowTitleSet, data.name);
        }
      });
  }, []);

  useEffect(() => {
    if (activeTab) {
      editorRef.current?.setContent(activeTab.content);
      const title = activeTab.path ? (activeTab.path.split(/[/\\]/).pop() ?? "WNote") : "未命名";
      window.electronAPI.send(IpcChannel.WindowTitleSet, title);
    }
  }, [activeTabId, activeTab?.path]); // eslint-disable-line

  const handleSave = useCallback(async (saveAs = false) => {
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
  }, []);

  const handleOpenFile = useCallback(async () => {
    const data = await window.electronAPI.invoke<{
      filePath: string;
      name: string;
      content: string;
    } | null>(IpcChannel.FileOpen);
    if (!data) {
      editorRef.current?.focus();
      return;
    }
    const tabId = openFileRef.current(data.filePath, data.content);
    if (tabId === activeTabIdRef.current) {
      editorRef.current?.setContent(data.content);
      window.electronAPI.send(IpcChannel.WindowTitleSet, data.name);
    }
    editorRef.current?.focus();
  }, []);

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

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.shiftKey && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
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

  const runFormat = useCallback(
    (fn: (view: NonNullable<ReturnType<EditorRef["getView"]>>) => boolean) => {
      const view = editorRef.current?.getView();
      if (view) fn(view);
      editorRef.current?.focus();
    },
    [],
  );

  const toggleOutline = useCallback(() => {
    setToggleOutlineSignal((value) => value + 1);
    editorRef.current?.focus();
  }, []);

  const commands = useMemo<PaletteCommand[]>(
    () => [
      {
        id: "new-file",
        label: "新建文档",
        keywords: ["new", "file", "xinjian", "wendang"],
        group: "文件",
        shortcut: "⌘N",
        run: () => {
          newTabRef.current();
          editorRef.current?.focus();
        },
      },
      {
        id: "open-file",
        label: "打开文件",
        keywords: ["open", "file", "dakai"],
        group: "文件",
        shortcut: "⌘O",
        run: handleOpenFile,
      },
      {
        id: "save",
        label: "保存",
        keywords: ["save", "baocun"],
        group: "文件",
        shortcut: "⌘S",
        run: () => handleSave(false),
      },
      {
        id: "save-as",
        label: "另存为",
        keywords: ["save as", "lingcun"],
        group: "文件",
        shortcut: "⇧⌘S",
        run: () => handleSave(true),
      },
      {
        id: "toggle-outline",
        label: "显示/隐藏大纲",
        keywords: ["outline", "sidebar", "dagang", "cebian"],
        group: "视图",
        shortcut: "⌘\\",
        run: toggleOutline,
      },
      {
        id: "heading1",
        label: "标题 1",
        keywords: ["h1", "heading", "biaoti"],
        group: "格式",
        shortcut: "⌘1",
        run: () => runFormat(formatCommands.heading1),
      },
      {
        id: "heading2",
        label: "标题 2",
        keywords: ["h2", "heading", "biaoti"],
        group: "格式",
        shortcut: "⌘2",
        run: () => runFormat(formatCommands.heading2),
      },
      {
        id: "heading3",
        label: "标题 3",
        keywords: ["h3", "heading", "biaoti"],
        group: "格式",
        shortcut: "⌘3",
        run: () => runFormat(formatCommands.heading3),
      },
      {
        id: "heading4",
        label: "标题 4",
        keywords: ["h4", "heading", "biaoti"],
        group: "格式",
        shortcut: "⌘4",
        run: () => runFormat(formatCommands.heading4),
      },
      {
        id: "heading-clear",
        label: "清除标题",
        keywords: ["heading clear", "biaoti"],
        group: "格式",
        shortcut: "⌘0",
        run: () => runFormat(formatCommands.headingClear),
      },
      {
        id: "bold",
        label: "粗体",
        keywords: ["bold", "strong", "cuti"],
        group: "格式",
        shortcut: "⌘B",
        run: () => runFormat(formatCommands.bold),
      },
      {
        id: "italic",
        label: "斜体",
        keywords: ["italic", "xieti"],
        group: "格式",
        shortcut: "⌘I",
        run: () => runFormat(formatCommands.italic),
      },
      {
        id: "strike",
        label: "删除线",
        keywords: ["strike", "del", "shanchu"],
        group: "格式",
        shortcut: "⇧⌘X",
        run: () => runFormat(formatCommands.strikethrough),
      },
      {
        id: "link",
        label: "链接",
        keywords: ["link", "url", "lianjie"],
        group: "格式",
        run: () => runFormat(formatCommands.link),
      },
      {
        id: "inline-code",
        label: "行内代码",
        keywords: ["code", "inline", "daima"],
        group: "格式",
        shortcut: "⌘E",
        run: () => runFormat(formatCommands.inlineCode),
      },
      {
        id: "code-block",
        label: "代码块",
        keywords: ["codeblock", "fence", "daimakuai"],
        group: "格式",
        shortcut: "⇧⌘`",
        run: () => runFormat(formatCommands.codeBlock),
      },
      {
        id: "blockquote",
        label: "引用",
        keywords: ["quote", "blockquote", "yinyong"],
        group: "格式",
        shortcut: "⇧⌘B",
        run: () => runFormat(formatCommands.blockquote),
      },
      {
        id: "unordered-list",
        label: "无序列表",
        keywords: ["ul", "list", "bullet", "wuxu"],
        group: "格式",
        shortcut: "⇧⌘U",
        run: () => runFormat(formatCommands.unorderedList),
      },
      {
        id: "ordered-list",
        label: "有序列表",
        keywords: ["ol", "list", "ordered", "youxu"],
        group: "格式",
        shortcut: "⇧⌘O",
        run: () => runFormat(formatCommands.orderedList),
      },
      {
        id: "task-list",
        label: "任务列表",
        keywords: ["task", "todo", "renwu"],
        group: "格式",
        shortcut: "⇧⌘T",
        run: () => runFormat(formatCommands.taskList),
      },
      {
        id: "horizontal-rule",
        label: "分割线",
        keywords: ["hr", "divider", "fengexian"],
        group: "格式",
        shortcut: "⌘↵",
        run: () => runFormat(formatCommands.horizontalRule),
      },
      {
        id: "image",
        label: "图片",
        keywords: ["image", "img", "tupian"],
        group: "格式",
        shortcut: "⇧⌘I",
        run: () => runFormat(formatCommands.image),
      },
      {
        id: "math",
        label: "数学公式",
        keywords: ["math", "formula", "shuxue"],
        group: "格式",
        shortcut: "⌘M",
        run: () => runFormat(formatCommands.math),
      },
    ],
    [handleOpenFile, handleSave, runFormat, toggleOutline],
  );

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
      toggleLeftSignal={toggleOutlineSignal}
      left={
        <DocumentOutline
          headings={headings}
          onHeadingClick={(h) => editorRef.current?.scrollToPos(h.from)}
        />
      }
      center={
        <div style={{ position: "relative", height: "100%" }}>
          <TabBar
            tabs={tabs}
            activeTabId={activeTabId}
            onSwitch={handleSwitchTab}
            onClose={handleCloseTab}
            onNew={handleNewTab}
          />
          <div style={{ height: "100%", overflow: "hidden" }}>
            <Editor
              ref={editorRef}
              onHeadingsChange={setHeadings}
              onChange={handleChange}
              onImageSave={handleImageSave}
            />
          </div>
          <CommandPalette
            open={paletteOpen}
            commands={commands}
            onClose={() => {
              setPaletteOpen(false);
              editorRef.current?.focus();
            }}
          />
        </div>
      }
    />
  );
}

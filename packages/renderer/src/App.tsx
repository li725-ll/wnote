import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import {
  buildAssetIndex,
  deleteAssetReference,
  replaceAssetReference,
  resolveAssetPreviewSrc,
} from "@wnote/assets";
import { Editor, formatCommands } from "@wnote/editor-react";
import type { EditorRef, HeadingItem } from "@wnote/editor-react";
import {
  IpcChannel,
  type AppSettings,
  type AssetRef,
  type AssetReference,
  type DeleteAssetResult,
  type DeleteManyAssetsResult,
  type ExportHtmlOptions,
  type ExportHtmlResult,
  type ExportPdfResult,
  type ExportPreviewResult,
  type OpenDocumentResult,
  type SaveDocumentResult,
  type ShellOpenPathResult,
} from "@wnote/contracts";
import { AppLayout } from "./layout/AppLayout";
import { DocumentOutline } from "./panels/FileTree";
import { SettingsPage } from "./pages/SettingsPage";
import { WelcomePage } from "./pages/WelcomePage";
import { useTheme } from "./hooks/useTheme";
import { useTabs } from "./hooks/useTabs";
import { TabBar } from "./components/TabBar";
import { CommandPalette, type PaletteCommand } from "./components/CommandPalette";
import { ExportDialog, type ExportFormat } from "./components/ExportDialog";
import { Toast, type ToastState } from "./components/Toast";
import { ResourcePanel } from "./panels/ResourcePanel";

const STORAGE_KEY = "wnote:welcomed";

const defaultExportOptions: Required<ExportHtmlOptions> = {
  inlineLocalImages: false,
  renderMermaid: true,
  theme: "light",
  pdf: {
    pageSize: "A4",
    orientation: "portrait",
    margin: "default",
    printBackground: true,
  },
};

export default function App() {
  const [view, setView] = useState<"welcome" | "editor" | "settings">(() => {
    return localStorage.getItem(STORAGE_KEY) ? "editor" : "welcome";
  });
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("html");
  const [exportOptions, setExportOptions] = useState(defaultExportOptions);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [toggleOutlineSignal, setToggleOutlineSignal] = useState(0);
  const editorRef = useRef<EditorRef>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportingRef = useRef(false);
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
    setAssets,
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
  const setAssetsRef = useRef(setAssets);
  setAssetsRef.current = setAssets;
  useEffect(() => {
    setContentSnapshot(() => editorRef.current?.getContent() ?? "");
  }, [setContentSnapshot]);

  const getEditorContent = useCallback(async () => {
    const tab = activeTabRef.current;
    return editorRef.current?.getContentAsync() ?? tab.content;
  }, []);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, []);

  const showToast = useCallback((next: Omit<ToastState, "id">, duration = 3200) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ ...next, id: Date.now() });
    if (duration > 0) {
      toastTimerRef.current = setTimeout(() => setToast(null), duration);
    }
  }, []);

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
      const data = args[0] as OpenDocumentResult;
      const tabId = openFileRef.current(data.filePath, data.content, data.assets);
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
      .invoke<OpenDocumentResult | null>(IpcChannel.LastOpenedFileGet)
      .then((data) => {
        if (!data) return;
        const tabId = openFileRef.current(data.filePath, data.content, data.assets);
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

  const handleSave = useCallback(
    async (saveAs = false) => {
      const tab = activeTabRef.current;
      const content = await getEditorContent();
      const result = await window.electronAPI.invoke<SaveDocumentResult | null>(
        IpcChannel.FileSave,
        {
          filePath: saveAs ? undefined : tab.path,
          content,
          defaultName: tab.path?.split(/[/\\]/).pop() ?? "untitled.md",
        },
      );
      if (result) {
        markSavedRef.current(result.filePath, result.assets);
        window.electronAPI.send(IpcChannel.WindowTitleSet, result.name);
      }
    },
    [getEditorContent],
  );

  const openExportDialog = useCallback((format: ExportFormat) => {
    if (exportingRef.current) return;
    setExportFormat(format);
    setExportDialogOpen(true);
  }, []);

  const handleExport = useCallback(
    async (format: ExportFormat, options: Required<ExportHtmlOptions>) => {
      if (exportingRef.current) return;
      exportingRef.current = true;
      setExportDialogOpen(false);
      setExportFormat(format);
      setExportOptions(options);
      const tab = activeTabRef.current;
      const content = await getEditorContent();
      const baseName =
        tab.path
          ?.split(/[/\\]/)
          .pop()
          ?.replace(/\.[^.]+$/, "") || "untitled";
      const label = format === "pdf" ? "PDF" : "HTML";
      const extension = format === "pdf" ? "pdf" : "html";
      showToast({ kind: "info", title: `正在导出 ${label}` }, 0);
      try {
        const result = await window.electronAPI.invoke<ExportHtmlResult | ExportPdfResult | null>(
          format === "pdf" ? IpcChannel.ExportPdf : IpcChannel.ExportHtml,
          {
            content,
            documentPath: tab.path,
            defaultName: `${baseName}.${extension}`,
            options,
          },
        );
        if (result) {
          showToast({
            kind: "success",
            title: `${label} 导出完成`,
            message: result.filePath,
            actions: [
              {
                label: "在 Finder 中显示",
                run: () => {
                  void window.electronAPI.invoke(IpcChannel.ShellShowItemInFolder, {
                    filePath: result.filePath,
                  });
                },
              },
              {
                label: "打开文件",
                run: () => {
                  void window.electronAPI
                    .invoke<ShellOpenPathResult>(IpcChannel.ShellOpenPath, {
                      filePath: result.filePath,
                    })
                    .then((openResult) => {
                      if (!openResult.ok) {
                        showToast(
                          {
                            kind: "error",
                            title: "打开文件失败",
                            message: openResult.error ?? result.filePath,
                          },
                          6000,
                        );
                      }
                    });
                },
              },
            ],
          });
          editorRef.current?.focus();
        } else {
          setToast(null);
          editorRef.current?.focus();
        }
      } catch (error) {
        showToast(
          {
            kind: "error",
            title: `${label} 导出失败`,
            message: error instanceof Error ? error.message : String(error),
          },
          6000,
        );
      } finally {
        exportingRef.current = false;
      }
    },
    [getEditorContent, showToast],
  );

  const handleExportPreview = useCallback(
    async (format: ExportFormat, options: Required<ExportHtmlOptions>) => {
      const tab = activeTabRef.current;
      const content = await getEditorContent();
      const baseName =
        tab.path
          ?.split(/[/\\]/)
          .pop()
          ?.replace(/\.[^.]+$/, "") || "untitled";
      const extension = format === "pdf" ? "pdf" : "html";
      setExportFormat(format);
      setExportOptions(options);
      try {
        const result = await window.electronAPI.invoke<ExportPreviewResult>(
          IpcChannel.ExportPreview,
          {
            content,
            documentPath: tab.path,
            defaultName: `${baseName}.${extension}`,
            format,
            options,
          },
        );
        if (result.ok) {
          showToast({ kind: "success", title: "导出预览已打开" });
        }
      } catch (error) {
        showToast(
          {
            kind: "error",
            title: "导出预览失败",
            message: error instanceof Error ? error.message : String(error),
          },
          6000,
        );
      }
    },
    [getEditorContent, showToast],
  );

  const handleOpenFile = useCallback(async () => {
    const data = await window.electronAPI.invoke<OpenDocumentResult | null>(IpcChannel.FileOpen);
    if (!data) {
      editorRef.current?.focus();
      return;
    }
    const tabId = openFileRef.current(data.filePath, data.content, data.assets);
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

  useEffect(() => {
    const handler = () => openExportDialog("html");
    window.electronAPI.on(IpcChannel.ExportHtmlTrigger, handler);
    return () => window.electronAPI.off(IpcChannel.ExportHtmlTrigger, handler);
  }, [openExportDialog]);

  useEffect(() => {
    const handler = () => openExportDialog("pdf");
    window.electronAPI.on(IpcChannel.ExportPdfTrigger, handler);
    return () => window.electronAPI.off(IpcChannel.ExportPdfTrigger, handler);
  }, [openExportDialog]);
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
      updateContent(
        content,
        buildAssetIndex(content, { documentPath: activeTabRef.current.path ?? undefined }),
      );
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
    const asset = await window.electronAPI.invoke<AssetRef | null>(IpcChannel.ImageSave, {
      buffer,
      ext,
      documentPath: activeTabRef.current.path,
      originalName: file.name,
      mime: file.type,
    });
    return asset ? { src: asset.markdownPath, previewSrc: asset.url } : null;
  }, []);

  const resolveEditorAsset = useCallback((src: string) => {
    return resolveAssetPreviewSrc(src, activeTabRef.current.path ?? undefined);
  }, []);

  const handleResourceClick = useCallback((reference: AssetReference) => {
    editorRef.current?.scrollToPos(reference.position);
    editorRef.current?.focus();
  }, []);

  const handleResourceDelete = useCallback(
    async (reference: AssetReference) => {
      const current = await getEditorContent();
      const next = deleteAssetReference(current, reference);
      if (next === current) return;
      editorRef.current?.setContent(next);
      handleChange(next);
      editorRef.current?.focus();
    },
    [getEditorContent, handleChange],
  );

  const handleResourceRelocate = useCallback(
    async (reference: AssetReference) => {
      const documentPath = activeTabRef.current.path;
      if (!documentPath) {
        window.alert("请先保存当前文档，再重新定位图片。");
        return;
      }
      const asset = await window.electronAPI.invoke<AssetRef | null>(IpcChannel.AssetImport, {
        documentPath,
      });
      if (!asset) return;
      const current = await getEditorContent();
      const next = replaceAssetReference(current, reference, asset.markdownPath);
      if (next === current) return;
      editorRef.current?.setContent(next);
      handleChange(next);
      editorRef.current?.focus();
    },
    [getEditorContent, handleChange],
  );

  const handleUnusedDelete = useCallback(
    async (asset: AssetRef) => {
      const tab = activeTabRef.current;
      if (!tab.path) return;
      const ok = window.confirm(`删除未引用资源？\n${asset.markdownPath}`);
      if (!ok) return;
      const content = await getEditorContent();
      const result = await window.electronAPI.invoke<DeleteAssetResult>(IpcChannel.AssetDelete, {
        documentPath: tab.path,
        absolutePath: asset.absolutePath,
        content,
      });
      setAssetsRef.current(result.assets);
    },
    [getEditorContent],
  );

  const handleUnusedDeleteAll = useCallback(
    async (assets: AssetRef[]) => {
      const tab = activeTabRef.current;
      if (!tab.path || assets.length === 0) return;
      const ok = window.confirm(`清理 ${assets.length} 个未引用资源？此操作会删除文件。`);
      if (!ok) return;
      const content = await getEditorContent();
      const result = await window.electronAPI.invoke<DeleteManyAssetsResult>(
        IpcChannel.AssetDeleteMany,
        {
          documentPath: tab.path,
          absolutePaths: assets.map((asset) => asset.absolutePath),
          content,
        },
      );
      setAssetsRef.current(result.assets);
      if (result.failed.length > 0) {
        window.alert(
          `已删除 ${result.deleted.length} 个资源，${result.failed.length} 个删除失败。`,
        );
      }
    },
    [getEditorContent],
  );

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
        id: "export-html",
        label: "导出为 HTML",
        keywords: ["export", "html", "daochu"],
        group: "文件",
        shortcut: "⇧⌘E",
        run: () => openExportDialog("html"),
      },
      {
        id: "export-pdf",
        label: "导出为 PDF",
        keywords: ["export", "pdf", "daochu"],
        group: "文件",
        shortcut: "⇧⌘P",
        run: () => openExportDialog("pdf"),
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
        id: "mermaid",
        label: "Mermaid 图表",
        keywords: ["mermaid", "diagram", "flowchart", "liuchengtu"],
        group: "格式",
        run: () => runFormat(formatCommands.mermaid),
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
        id: "table-insert",
        label: "插入表格",
        keywords: ["table", "insert", "biaoge"],
        group: "表格",
        run: () => runFormat(formatCommands.tableInsert),
      },
      {
        id: "table-add-row-before",
        label: "上方插入行",
        keywords: ["table", "row", "before", "shangfang"],
        group: "表格",
        run: () => runFormat(formatCommands.tableAddRowBefore),
      },
      {
        id: "table-add-row-after",
        label: "下方插入行",
        keywords: ["table", "row", "after", "xiafang"],
        group: "表格",
        run: () => runFormat(formatCommands.tableAddRowAfter),
      },
      {
        id: "table-delete-row",
        label: "删除当前行",
        keywords: ["table", "row", "delete", "shanchu"],
        group: "表格",
        run: () => runFormat(formatCommands.tableDeleteRow),
      },
      {
        id: "table-add-column-before",
        label: "左侧插入列",
        keywords: ["table", "column", "before", "zuoce"],
        group: "表格",
        run: () => runFormat(formatCommands.tableAddColumnBefore),
      },
      {
        id: "table-add-column-after",
        label: "右侧插入列",
        keywords: ["table", "column", "after", "youce"],
        group: "表格",
        run: () => runFormat(formatCommands.tableAddColumnAfter),
      },
      {
        id: "table-delete-column",
        label: "删除当前列",
        keywords: ["table", "column", "delete", "shanchu"],
        group: "表格",
        run: () => runFormat(formatCommands.tableDeleteColumn),
      },
      {
        id: "table-toggle-header-row",
        label: "切换表头行",
        keywords: ["table", "header", "biaotou"],
        group: "表格",
        run: () => runFormat(formatCommands.tableToggleHeaderRow),
      },
      {
        id: "table-merge-cells",
        label: "合并单元格",
        keywords: ["table", "merge", "hebing"],
        group: "表格",
        run: () => runFormat(formatCommands.tableMergeCells),
      },
      {
        id: "table-split-cell",
        label: "拆分单元格",
        keywords: ["table", "split", "chaifen"],
        group: "表格",
        run: () => runFormat(formatCommands.tableSplitCell),
      },
      {
        id: "table-delete",
        label: "删除表格",
        keywords: ["table", "delete", "shanchu"],
        group: "表格",
        run: () => runFormat(formatCommands.tableDelete),
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
    [handleOpenFile, handleSave, openExportDialog, runFormat, toggleOutline],
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
        <>
          <DocumentOutline
            headings={headings}
            onHeadingClick={(h) => editorRef.current?.scrollToPos(h.from)}
          />
          <ResourcePanel
            assets={activeTab.assets}
            onReferenceClick={handleResourceClick}
            onReferenceDelete={handleResourceDelete}
            onReferenceRelocate={handleResourceRelocate}
            onUnusedDelete={handleUnusedDelete}
            onUnusedDeleteAll={handleUnusedDeleteAll}
          />
        </>
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
              assetResolver={resolveEditorAsset}
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
          <ExportDialog
            open={exportDialogOpen}
            format={exportFormat}
            initialOptions={exportOptions}
            onCancel={() => {
              setExportDialogOpen(false);
              editorRef.current?.focus();
            }}
            onConfirm={(format, options) => {
              void handleExport(format, options);
            }}
            onPreview={(format, options) => {
              void handleExportPreview(format, options);
            }}
          />
          <Toast toast={toast} onClose={() => setToast(null)} />
        </div>
      }
    />
  );
}

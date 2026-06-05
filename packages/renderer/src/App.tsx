import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Editor } from "@wnote/editor-react";
import type { EditorRef, HeadingItem } from "@wnote/editor-react";
import {
  IpcChannel,
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
import { CommandPalette } from "./components/CommandPalette";
import { isCommandPaletteToggleKey } from "./components/command-palette-state";
import { ExportDialog, type ExportFormat } from "./components/ExportDialog";
import { Toast } from "./components/Toast";
import { ResourcePanel } from "./panels/ResourcePanel";
import {
  createExportSuccessActions,
  defaultExportOptions,
  describeExport,
} from "./export/export-state";
import {
  buildDocumentAssetIndex,
  canRelocateDocumentAsset,
  getAssetRelocateBlockedMessage,
  getUnusedAssetDeleteAllConfirmMessage,
  getUnusedAssetDeleteConfirmMessage,
  getUnusedAssetDeleteFailureMessage,
  relocateDocumentAssetReference,
  removeDocumentAssetReference,
  resolveDocumentAssetPreview,
} from "./assets/asset-state";
import { formatIpcCommandEntries } from "./commands/format-ipc";
import { buildPaletteCommands } from "./commands/palette-commands";
import {
  getDocumentTitle,
  getSaveDefaultName,
  shouldApplyOpenedDocument,
} from "./files/file-state";
import { useToastController } from "./hooks/useToastController";
import { useAutoSave } from "./hooks/useAutoSave";
import { useAppSettingsSync } from "./hooks/useAppSettingsSync";
import { useNavigationIpc } from "./hooks/useNavigationIpc";
import { useFileIpc } from "./hooks/useFileIpc";

const STORAGE_KEY = "wnote:welcomed";

export default function App() {
  const [view, setView] = useState<"welcome" | "editor" | "settings">(() => {
    return localStorage.getItem(STORAGE_KEY) ? "editor" : "welcome";
  });
  const [headings, setHeadings] = useState<HeadingItem[]>([]);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<ExportFormat>("html");
  const [exportOptions, setExportOptions] = useState(defaultExportOptions);
  const [toggleOutlineSignal, setToggleOutlineSignal] = useState(0);
  const editorRef = useRef<EditorRef>(null);
  const exportingRef = useRef(false);
  const { setTheme } = useTheme();
  const { toast, showToast, closeToast } = useToastController();
  const [autoSave, setAutoSave] = useState(true);

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

  const applyOpenedDocument = useCallback((data: OpenDocumentResult) => {
    const tabId = openFileRef.current(data.filePath, data.content, data.assets);
    if (shouldApplyOpenedDocument(tabId, activeTabIdRef.current)) {
      editorRef.current?.setContent(data.content);
      window.electronAPI.send(IpcChannel.WindowTitleSet, data.name);
    }
  }, []);

  useAppSettingsSync({
    onAutoSaveChange: setAutoSave,
    onThemeChange: setTheme,
  });

  const handleNavigate = useCallback((page: string) => {
    if (page === "settings") setView("settings");
  }, []);
  useNavigationIpc(handleNavigate);

  const handleIpcNewFile = useCallback(() => newTabRef.current(), []);
  const handleIpcCloseFile = useCallback(() => closeTabRef.current(activeTabIdRef.current), []);
  useFileIpc({
    onOpened: applyOpenedDocument,
    onNew: handleIpcNewFile,
    onClose: handleIpcCloseFile,
  });

  useEffect(() => {
    if (activeTab) {
      editorRef.current?.setContent(activeTab.content);
      window.electronAPI.send(IpcChannel.WindowTitleSet, getDocumentTitle(activeTab.path));
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
          defaultName: getSaveDefaultName(tab.path),
        },
      );
      if (result) {
        markSavedRef.current(result.filePath, result.assets);
        window.electronAPI.send(IpcChannel.WindowTitleSet, result.name);
      }
    },
    [getEditorContent],
  );
  const { scheduleAutoSave } = useAutoSave(autoSave, () => handleSave(false));

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
      const descriptor = describeExport(format, tab.path);
      const { label } = descriptor;
      showToast({ kind: "info", title: `正在导出 ${label}` }, 0);
      try {
        const result = await window.electronAPI.invoke<ExportHtmlResult | ExportPdfResult | null>(
          descriptor.channel,
          {
            content,
            documentPath: tab.path,
            defaultName: descriptor.defaultName,
            options,
          },
        );
        if (result) {
          showToast({
            kind: "success",
            title: `${label} 导出完成`,
            message: result.filePath,
            actions: createExportSuccessActions(result.filePath, {
              showInFolder: (filePath) => {
                void window.electronAPI.invoke(IpcChannel.ShellShowItemInFolder, { filePath });
              },
              openFile: (filePath) => {
                void window.electronAPI
                  .invoke<ShellOpenPathResult>(IpcChannel.ShellOpenPath, { filePath })
                  .then((openResult) => {
                    if (!openResult.ok) {
                      showToast(
                        {
                          kind: "error",
                          title: "打开文件失败",
                          message: openResult.error ?? filePath,
                        },
                        6000,
                      );
                    }
                  });
              },
            }),
          });
          editorRef.current?.focus();
        } else {
          closeToast();
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
    [closeToast, getEditorContent, showToast],
  );

  const handleExportPreview = useCallback(
    async (format: ExportFormat, options: Required<ExportHtmlOptions>) => {
      const tab = activeTabRef.current;
      const content = await getEditorContent();
      const descriptor = describeExport(format, tab.path);
      setExportFormat(format);
      setExportOptions(options);
      try {
        const result = await window.electronAPI.invoke<ExportPreviewResult>(
          IpcChannel.ExportPreview,
          {
            content,
            documentPath: tab.path,
            defaultName: descriptor.defaultName,
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
    applyOpenedDocument(data);
    editorRef.current?.focus();
  }, [applyOpenedDocument]);

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
    const handlers = formatIpcCommandEntries.map(([channel, fn]) => {
      const handler = () => {
        const view = editorRef.current?.getView();
        if (view) fn(view);
      };
      window.electronAPI.on(channel, handler);
      return [channel, handler] as const;
    });
    return () => {
      for (const [channel, handler] of handlers) {
        window.electronAPI.off(channel, handler);
      }
    };
  }, []);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isCommandPaletteToggleKey(event)) {
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
      updateContent(content, buildDocumentAssetIndex(content, activeTabRef.current.path));
      scheduleAutoSave(activeTabRef.current.path);
    },
    [updateContent, scheduleAutoSave],
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
    return resolveDocumentAssetPreview(src, activeTabRef.current.assets, activeTabRef.current.path);
  }, []);

  const handleResourceClick = useCallback((reference: AssetReference) => {
    editorRef.current?.scrollToPos(reference.position);
    editorRef.current?.focus();
  }, []);

  const handleResourceDelete = useCallback(
    async (reference: AssetReference) => {
      const current = await getEditorContent();
      const next = removeDocumentAssetReference(current, reference);
      if (!next) return;
      editorRef.current?.setContent(next);
      handleChange(next);
      editorRef.current?.focus();
    },
    [getEditorContent, handleChange],
  );

  const handleResourceRelocate = useCallback(
    async (reference: AssetReference) => {
      const documentPath = activeTabRef.current.path;
      if (!canRelocateDocumentAsset(documentPath)) {
        window.alert(getAssetRelocateBlockedMessage());
        return;
      }
      const asset = await window.electronAPI.invoke<AssetRef | null>(IpcChannel.AssetImport, {
        documentPath,
      });
      if (!asset) return;
      const current = await getEditorContent();
      const next = relocateDocumentAssetReference(current, reference, asset.markdownPath);
      if (!next) return;
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
      const ok = window.confirm(getUnusedAssetDeleteConfirmMessage(asset.markdownPath));
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
      const ok = window.confirm(getUnusedAssetDeleteAllConfirmMessage(assets.length));
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
          getUnusedAssetDeleteFailureMessage(result.deleted.length, result.failed.length),
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

  const commands = useMemo(
    () =>
      buildPaletteCommands({
        newFile: () => {
          newTabRef.current();
          editorRef.current?.focus();
        },
        openFile: handleOpenFile,
        save: handleSave,
        openExportDialog,
        toggleOutline,
        runFormat,
      }),
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
          <Toast toast={toast} onClose={closeToast} />
        </div>
      }
    />
  );
}

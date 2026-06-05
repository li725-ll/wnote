import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Editor } from "@wnote/editor-react";
import type { EditorRef, HeadingItem } from "@wnote/editor-react";
import { IpcChannel, type OpenDocumentResult, type SaveDocumentResult } from "@wnote/contracts";
import { AppLayout } from "./layout/AppLayout";
import { DocumentOutline } from "./panels/FileTree";
import { SettingsPage } from "./pages/SettingsPage";
import { WelcomePage } from "./pages/WelcomePage";
import { useTheme } from "./hooks/useTheme";
import { useTabs } from "./hooks/useTabs";
import { TabBar } from "./components/TabBar";
import { CommandPalette } from "./components/CommandPalette";
import { ExportDialog, type ExportFormat } from "./components/ExportDialog";
import { Toast } from "./components/Toast";
import { ResourcePanel } from "./panels/ResourcePanel";
import { defaultExportOptions } from "./export/export-state";
import { buildDocumentAssetIndex } from "./assets/asset-state";
import { buildPaletteCommands } from "./commands/palette-commands";
import { shouldApplyOpenedDocument } from "./files/file-state";
import { useToastController } from "./hooks/useToastController";
import { useAutoSave } from "./hooks/useAutoSave";
import { useAppSettingsSync } from "./hooks/useAppSettingsSync";
import { useNavigationIpc } from "./hooks/useNavigationIpc";
import { useFileIpc } from "./hooks/useFileIpc";
import { useMenuActionIpc } from "./hooks/useMenuActionIpc";
import { useFormatIpc } from "./hooks/useFormatIpc";
import { useCommandPaletteShortcut } from "./hooks/useCommandPaletteShortcut";
import { useActiveTabEditorSync } from "./hooks/useActiveTabEditorSync";
import { useDocumentSave } from "./hooks/useDocumentSave";
import { useEditorAssetActions } from "./hooks/useEditorAssetActions";
import { useExportActions } from "./hooks/useExportActions";

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
  const getCurrentTab = useCallback(() => activeTabRef.current, []);

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

  useActiveTabEditorSync({ activeTab, activeTabId, editorRef });

  const handleSaved = useCallback((result: SaveDocumentResult) => {
    markSavedRef.current(result.filePath, result.assets);
    window.electronAPI.send(IpcChannel.WindowTitleSet, result.name);
  }, []);
  const handleSave = useDocumentSave({
    getCurrentTab,
    getEditorContent,
    onSaved: handleSaved,
  });
  const { scheduleAutoSave } = useAutoSave(autoSave, () => handleSave(false));

  const { openExportDialog, handleExport, handleExportPreview } = useExportActions({
    editorRef,
    exportingRef,
    getCurrentTab,
    getEditorContent,
    closeToast,
    showToast,
    onDialogOpenChange: setExportDialogOpen,
    onFormatChange: setExportFormat,
    onOptionsChange: setExportOptions,
  });

  const handleOpenFile = useCallback(async () => {
    const data = await window.electronAPI.invoke<OpenDocumentResult | null>(IpcChannel.FileOpen);
    if (!data) {
      editorRef.current?.focus();
      return;
    }
    applyOpenedDocument(data);
    editorRef.current?.focus();
  }, [applyOpenedDocument]);

  const handleIpcSave = useCallback(() => {
    void handleSave(false);
  }, [handleSave]);
  const handleIpcSaveAs = useCallback(() => {
    void handleSave(true);
  }, [handleSave]);
  const handleIpcExportHtml = useCallback(() => openExportDialog("html"), [openExportDialog]);
  const handleIpcExportPdf = useCallback(() => openExportDialog("pdf"), [openExportDialog]);
  useMenuActionIpc({
    onSave: handleIpcSave,
    onSaveAs: handleIpcSaveAs,
    onExportHtml: handleIpcExportHtml,
    onExportPdf: handleIpcExportPdf,
  });
  const getFormatEditorView = useCallback(() => editorRef.current?.getView() ?? null, []);
  useFormatIpc(getFormatEditorView);

  const toggleCommandPalette = useCallback(() => {
    setPaletteOpen((open) => !open);
  }, []);
  useCommandPaletteShortcut(toggleCommandPalette);

  // Auto-save
  const handleChange = useCallback(
    (content: string) => {
      updateContent(content, buildDocumentAssetIndex(content, activeTabRef.current.path));
      scheduleAutoSave(activeTabRef.current.path);
    },
    [updateContent, scheduleAutoSave],
  );
  const handleAssetsChange = useCallback((assets: Parameters<typeof setAssets>[0]) => {
    setAssetsRef.current(assets);
  }, []);

  const handleNewTab = useCallback(() => {
    newTab();
  }, [newTab]);

  const {
    handleImageSave,
    resolveEditorAsset,
    handleResourceClick,
    handleResourceDelete,
    handleResourceRelocate,
    handleUnusedDelete,
    handleUnusedDeleteAll,
  } = useEditorAssetActions({
    editorRef,
    getCurrentTab,
    getEditorContent,
    onContentChange: handleChange,
    onAssetsChange: handleAssetsChange,
  });

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

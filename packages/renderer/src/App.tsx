import { Suspense, lazy, useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { EditorRef, HeadingItem } from "@wnote/editor-react";
import type { SaveDocumentResult } from "@wnote/contracts";
import { AppLayout } from "./layout/AppLayout";
import { DocumentOutline } from "./panels/FileTree";
import { useTheme } from "./hooks/useTheme";
import { useTabs } from "./hooks/useTabs";
import { TabBar } from "./components/TabBar";
import type { ExportFormat } from "./export/export-state";
import { Toast } from "./components/Toast";
import { defaultExportOptions } from "./export/export-state";
import { buildDocumentAssetIndex } from "./assets/asset-state";
import { buildPaletteCommands } from "./commands/palette-commands";
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
import { useWindowTitle } from "./hooks/useWindowTitle";
import { useDocumentOpen } from "./hooks/useDocumentOpen";

const STORAGE_KEY = "wnote:welcomed";

const WelcomePage = lazy(() =>
  import("./pages/WelcomePage").then((module) => ({ default: module.WelcomePage })),
);
const SettingsPage = lazy(() =>
  import("./pages/SettingsPage").then((module) => ({ default: module.SettingsPage })),
);
const CommandPalette = lazy(() =>
  import("./components/CommandPalette").then((module) => ({ default: module.CommandPalette })),
);
const ExportDialog = lazy(() =>
  import("./components/ExportDialog").then((module) => ({ default: module.ExportDialog })),
);
const ResourcePanel = lazy(() =>
  import("./panels/ResourcePanel").then((module) => ({ default: module.ResourcePanel })),
);
const Editor = lazy(() =>
  import("@wnote/editor-react").then((module) => ({ default: module.Editor })),
);

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
  const [editorReadySignal, setEditorReadySignal] = useState(0);
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
  const getActiveTabId = useCallback(() => activeTabIdRef.current, []);
  const setWindowTitle = useWindowTitle();
  const showEditor = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    setView("editor");
  }, []);
  const setEditorInstance = useCallback((instance: EditorRef | null) => {
    editorRef.current = instance;
    if (instance) setEditorReadySignal((value) => value + 1);
  }, []);
  const { applyOpenedDocument, openDocumentDialog } = useDocumentOpen({
    editorRef,
    getActiveTabId,
    onDocumentOpen: showEditor,
    openFile,
    setWindowTitle,
  });

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

  useActiveTabEditorSync({ activeTab, activeTabId, editorRef, editorReadySignal, setWindowTitle });

  const handleSaved = useCallback(
    (result: SaveDocumentResult) => {
      markSavedRef.current(result.filePath, result.assets);
      setWindowTitle(result.name);
    },
    [setWindowTitle],
  );
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
        openFile: openDocumentDialog,
        save: handleSave,
        openExportDialog,
        toggleOutline,
        runFormat,
      }),
    [handleSave, openDocumentDialog, openExportDialog, runFormat, toggleOutline],
  );

  const handleWelcomeStart = () => {
    showEditor();
  };

  if (view === "welcome") {
    return (
      <Suspense fallback={null}>
        <WelcomePage onStart={handleWelcomeStart} />
      </Suspense>
    );
  }

  if (view === "settings") {
    return (
      <Suspense fallback={null}>
        <SettingsPage onBack={() => setView("editor")} onThemeChange={setTheme} />
      </Suspense>
    );
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
          <Suspense fallback={null}>
            <ResourcePanel
              assets={activeTab.assets}
              onReferenceClick={handleResourceClick}
              onReferenceDelete={handleResourceDelete}
              onReferenceRelocate={handleResourceRelocate}
              onUnusedDelete={handleUnusedDelete}
              onUnusedDeleteAll={handleUnusedDeleteAll}
            />
          </Suspense>
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
            <Suspense fallback={null}>
              <Editor
                ref={setEditorInstance}
                onHeadingsChange={setHeadings}
                onChange={handleChange}
                onImageSave={handleImageSave}
                assetResolver={resolveEditorAsset}
              />
            </Suspense>
          </div>
          <Suspense fallback={null}>
            {paletteOpen ? (
              <CommandPalette
                open={paletteOpen}
                commands={commands}
                onClose={() => {
                  setPaletteOpen(false);
                  editorRef.current?.focus();
                }}
              />
            ) : null}
            {exportDialogOpen ? (
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
            ) : null}
          </Suspense>
          <Toast toast={toast} onClose={closeToast} />
        </div>
      }
    />
  );
}

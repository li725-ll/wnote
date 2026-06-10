import { Suspense, lazy, useCallback, useEffect, useMemo, useRef } from "react";
import type { EditorRef } from "@wnote/editor-react";
import type { SaveDocumentResult } from "@wnote/contracts";
import { AppLayout } from "../layout/AppLayout";
import { DocumentOutline } from "../panels/FileTree";
import { WorkspacePanel } from "../panels/WorkspacePanel";
import { useTabs } from "../hooks/useTabs";
import styles from "../App.module.css";
import { TabBar } from "../components/TabBar";
import { TitleBar } from "../components/TitleBar";
import { Toast } from "../components/Toast";
import { StatusBar } from "../components/StatusBar";
import { buildDocumentAssetIndex } from "../assets/asset-state";
import type { PaletteCommandActions } from "../commands/palette-commands";
import { useToastController } from "../hooks/useToastController";
import { useAutoSave } from "../hooks/useAutoSave";
import { useFileIpc } from "../hooks/useFileIpc";
import { useMenuActionIpc } from "../hooks/useMenuActionIpc";
import { useFormatIpc } from "../hooks/useFormatIpc";
import { useCommandPaletteShortcut } from "../hooks/useCommandPaletteShortcut";
import { useActiveTabEditorSync } from "../hooks/useActiveTabEditorSync";
import { useDocumentSave } from "../hooks/useDocumentSave";
import { useEditorAssetActions } from "../hooks/useEditorAssetActions";
import { useExportActions } from "../hooks/useExportActions";
import { useWindowTitle } from "../hooks/useWindowTitle";
import { useDocumentOpen } from "../hooks/useDocumentOpen";
import { useWorkspace } from "../hooks/useWorkspace";
import { useSettingsStore } from "../stores/settings-store";
import { useEditorMetaStore } from "../stores/editor-meta-store";
import { useUiStore } from "../stores/ui-store";

const STORAGE_KEY = "wnote:welcomed";

const CommandPalette = lazy(() =>
  import("../components/CommandPalette").then((module) => ({ default: module.CommandPalette })),
);
const ExportDialog = lazy(() =>
  import("../components/ExportDialog").then((module) => ({ default: module.ExportDialog })),
);
const ResourcePanel = lazy(() =>
  import("../panels/ResourcePanel").then((module) => ({ default: module.ResourcePanel })),
);
const Editor = lazy(() =>
  import("@wnote/editor-react").then((module) => ({ default: module.Editor })),
);

export function EditorPage() {
  const editorRef = useRef<EditorRef>(null);
  const exportingRef = useRef(false);
  const { toast, showToast, closeToast } = useToastController();
  const autoSave = useSettingsStore((state) => state.autoSave);
  const headings = useEditorMetaStore((state) => state.headings);
  const editorReadySignal = useEditorMetaStore((state) => state.editorReadySignal);
  const setHeadings = useEditorMetaStore((state) => state.setHeadings);
  const markEditorReady = useEditorMetaStore((state) => state.markEditorReady);
  const paletteOpen = useUiStore((state) => state.paletteOpen);
  const exportDialogOpen = useUiStore((state) => state.exportDialogOpen);
  const exportFormat = useUiStore((state) => state.exportFormat);
  const exportOptions = useUiStore((state) => state.exportOptions);
  const toggleOutlineSignal = useUiStore((state) => state.toggleOutlineSignal);
  const setPaletteOpen = useUiStore((state) => state.setPaletteOpen);
  const togglePalette = useUiStore((state) => state.togglePalette);
  const setExportDialogOpen = useUiStore((state) => state.setExportDialogOpen);
  const setExportFormat = useUiStore((state) => state.setExportFormat);
  const setExportOptions = useUiStore((state) => state.setExportOptions);
  const triggerToggleOutline = useUiStore((state) => state.triggerToggleOutline);

  const {
    tabs,
    activeTab,
    activeTabId,
    newTab,
    closeTab,
    closePath,
    closePathPrefix,
    switchTab,
    updateContent,
    openFile,
    markSaved,
    renamePath,
    renamePathPrefix,
    setAssets,
    setContentSnapshot,
  } = useTabs();

  const appTitle = useMemo(() => {
    if (activeTab.path) {
      const parts = activeTab.path.split(/[/\\]/);
      return parts[parts.length - 1] || "未命名";
    }
    return "未命名";
  }, [activeTab.path]);

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
    localStorage.setItem(STORAGE_KEY, "1");
    setContentSnapshot(() => editorRef.current?.getContent() ?? "");
  }, [setContentSnapshot]);

  const getEditorContent = useCallback(async () => {
    const tab = activeTabRef.current;
    return editorRef.current?.getContentAsync() ?? tab.content;
  }, []);
  const getCurrentTab = useCallback(() => activeTabRef.current, []);
  const getActiveTabId = useCallback(() => activeTabIdRef.current, []);
  const setWindowTitle = useWindowTitle();
  const setEditorInstance = useCallback(
    (instance: EditorRef | null) => {
      editorRef.current = instance;
      if (instance) markEditorReady();
    },
    [markEditorReady],
  );
  const { applyOpenedDocument, openDocumentDialog } = useDocumentOpen({
    editorRef,
    getActiveTabId,
    onDocumentOpen: () => localStorage.setItem(STORAGE_KEY, "1"),
    openFile,
    setWindowTitle,
  });
  const {
    workspace,
    loading: workspaceLoading,
    openWorkspace,
    refreshWorkspace,
    openWorkspaceFile,
    createWorkspaceFile,
    createWorkspaceDirectory,
    renameWorkspaceEntry,
    moveWorkspaceEntry,
    deleteWorkspaceEntry,
  } = useWorkspace({
    onDocumentOpen: applyOpenedDocument,
    onDeletePath: (path, nodeType) => {
      if (nodeType === "directory") closePathPrefix(path);
      else closePath(path);
    },
    onMovePath: (oldPath, newPath, nodeType) => {
      if (nodeType === "directory") renamePathPrefix(oldPath, newPath);
      else renamePath(oldPath, newPath);
    },
    onRenamePath: (oldPath, newPath, nodeType) => {
      if (nodeType === "directory") renamePathPrefix(oldPath, newPath);
      else renamePath(oldPath, newPath);
    },
    onError: (message) => {
      showToast({ kind: "error", title: "工作区操作失败", message }, 5200);
    },
  });

  const handleIpcNewFile = useCallback(() => newTabRef.current(), []);
  const handleIpcCloseFile = useCallback(() => closeTabRef.current(activeTabIdRef.current), []);
  useFileIpc({
    onOpened: applyOpenedDocument,
    onNew: handleIpcNewFile,
    onClose: handleIpcCloseFile,
  });

  useActiveTabEditorSync({ activeTab, activeTabId, editorRef, editorReadySignal, setWindowTitle });

  const handleSaved = useCallback(
    (result: SaveDocumentResult, content: string) => {
      markSavedRef.current(result.filePath, content, result.stat, result.assets);
      setWindowTitle(result.name);
    },
    [setWindowTitle],
  );
  const handleSave = useDocumentSave({
    getCurrentTab,
    getEditorContent,
    onError: (message) => showToast({ kind: "error", title: "保存失败", message }, 5200),
    onReloadFromDisk: applyOpenedDocument,
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
  useCommandPaletteShortcut(togglePalette);

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
    handleImageReveal,
    handleImagePathCopy,
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
    triggerToggleOutline();
    editorRef.current?.focus();
  }, [triggerToggleOutline]);

  const commandActions = useMemo<PaletteCommandActions>(
    () => ({
      newFile: () => {
        newTabRef.current();
        editorRef.current?.focus();
      },
      openFile: openDocumentDialog,
      openWorkspace,
      save: handleSave,
      openExportDialog,
      toggleOutline,
      runFormat,
    }),
    [handleSave, openDocumentDialog, openExportDialog, openWorkspace, runFormat, toggleOutline],
  );

  return (
    <div className={styles.shell}>
      <TitleBar title={appTitle} dirty={activeTab.dirty} onToggleSidebar={triggerToggleOutline} />
      <div className={styles.content}>
        <AppLayout
          toggleLeftSignal={toggleOutlineSignal}
          left={
            <>
              <WorkspacePanel
                name={workspace?.name}
                tree={workspace?.tree ?? []}
                activePath={activeTab.path}
                loading={workspaceLoading}
                onOpenWorkspace={openWorkspace}
                onOpenFile={(filePath) => {
                  void openWorkspaceFile(filePath);
                }}
                onCreateFile={(name, parentPath) => {
                  void createWorkspaceFile(name, parentPath);
                }}
                onCreateDirectory={(name, parentPath) => {
                  void createWorkspaceDirectory(name, parentPath);
                }}
                onRefresh={() => {
                  void refreshWorkspace();
                }}
                onRename={(path, name) => {
                  void renameWorkspaceEntry(path, name);
                }}
                onMove={(sourcePath, targetDirectoryPath) => {
                  void moveWorkspaceEntry(sourcePath, targetDirectoryPath);
                }}
                onDelete={(path, recursive) => {
                  void deleteWorkspaceEntry(path, recursive);
                }}
              />
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
            <div className={styles.editorPane}>
              <TabBar
                tabs={tabs}
                activeTabId={activeTabId}
                onSwitch={handleSwitchTab}
                onClose={handleCloseTab}
                onNew={handleNewTab}
              />
              <div className={styles.editorBody}>
                <Suspense fallback={null}>
                  <Editor
                    ref={setEditorInstance}
                    onHeadingsChange={setHeadings}
                    onChange={handleChange}
                    onImageSave={handleImageSave}
                    onImageReveal={handleImageReveal}
                    onImagePathCopy={handleImagePathCopy}
                    assetResolver={resolveEditorAsset}
                  />
                </Suspense>
              </div>
              <StatusBar
                content={activeTab.content}
                dirty={activeTab.dirty}
                path={activeTab.path}
              />
              <Suspense fallback={null}>
                {paletteOpen ? (
                  <CommandPalette
                    open={paletteOpen}
                    actions={commandActions}
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
      </div>
    </div>
  );
}

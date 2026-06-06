import { useCallback, type RefObject } from "react";
import {
  IpcChannel,
  type ExportHtmlOptions,
  type ExportHtmlResult,
  type ExportPdfResult,
  type ExportPreviewResult,
  type ShellOpenPathResult,
} from "@wnote/contracts";
import type { EditorRef } from "@wnote/editor-react";
import type { ToastState } from "../components/Toast";
import type { ExportFormat } from "../export/export-state";
import { createExportSuccessActions, describeExport } from "../export/export-state";
import type { DocumentTab } from "./useTabs";

export function useExportActions({
  editorRef,
  exportingRef,
  getCurrentTab,
  getEditorContent,
  closeToast,
  showToast,
  onDialogOpenChange,
  onFormatChange,
  onOptionsChange,
}: {
  editorRef: RefObject<EditorRef | null>;
  exportingRef: RefObject<boolean>;
  getCurrentTab(): Pick<DocumentTab, "path">;
  getEditorContent(): Promise<string>;
  closeToast(): void;
  showToast(toast: Omit<ToastState, "id">, duration?: number): void;
  onDialogOpenChange(open: boolean): void;
  onFormatChange(format: ExportFormat): void;
  onOptionsChange(options: Required<ExportHtmlOptions>): void;
}) {
  const openExportDialog = useCallback(
    (format: ExportFormat) => {
      if (exportingRef.current) return;
      onFormatChange(format);
      onDialogOpenChange(true);
    },
    [exportingRef, onDialogOpenChange, onFormatChange],
  );

  const handleExport = useCallback(
    async (format: ExportFormat, options: Required<ExportHtmlOptions>) => {
      if (exportingRef.current) return;
      exportingRef.current = true;
      onDialogOpenChange(false);
      onFormatChange(format);
      onOptionsChange(options);
      const tab = getCurrentTab();
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
    [
      closeToast,
      editorRef,
      exportingRef,
      getCurrentTab,
      getEditorContent,
      onDialogOpenChange,
      onFormatChange,
      onOptionsChange,
      showToast,
    ],
  );

  const handleExportPreview = useCallback(
    async (format: ExportFormat, options: Required<ExportHtmlOptions>) => {
      const tab = getCurrentTab();
      const content = await getEditorContent();
      const descriptor = describeExport(format, tab.path);
      onFormatChange(format);
      onOptionsChange(options);
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
    [getCurrentTab, getEditorContent, onFormatChange, onOptionsChange, showToast],
  );

  return { openExportDialog, handleExport, handleExportPreview };
}

import { useCallback } from "react";
import { IpcChannel, type OpenDocumentResult, type SaveDocumentResult } from "@wnote/contracts";
import { getSaveDefaultName } from "../files/file-state";
import type { DocumentTab } from "./useTabs";

export function useDocumentSave({
  getCurrentTab,
  getEditorContent,
  onSaved,
  onReloadFromDisk,
  onError,
}: {
  getCurrentTab(): Pick<DocumentTab, "path" | "stat">;
  getEditorContent(): Promise<string>;
  onSaved(result: SaveDocumentResult, content: string): void;
  onReloadFromDisk(data: OpenDocumentResult): void;
  onError(message: string): void;
}) {
  return useCallback(
    async (saveAs = false) => {
      const tab = getCurrentTab();
      const content = await getEditorContent();
      try {
        const result = await window.electronAPI.invoke<SaveDocumentResult | null>(
          IpcChannel.FileSave,
          {
            filePath: saveAs ? undefined : tab.path,
            content,
            defaultName: getSaveDefaultName(tab.path),
            expectedStat: saveAs ? undefined : tab.stat,
          },
        );
        if (result) onSaved(result, content);
      } catch (error) {
        if (isDiskConflict(error) && tab.path) {
          const reload = window.confirm(
            "文件已在磁盘上更改。重新载入磁盘版本？取消将保留当前编辑器内容。",
          );
          if (!reload) return;
          const data = await window.electronAPI.invoke<OpenDocumentResult | null>(
            IpcChannel.WorkspaceFileOpen,
            tab.path,
          );
          if (data) onReloadFromDisk(data);
          return;
        }
        onError(saveErrorMessage(error));
      }
    },
    [getCurrentTab, getEditorContent, onError, onReloadFromDisk, onSaved],
  );
}

function isDiskConflict(error: unknown): boolean {
  return error instanceof Error && error.message.includes("changed on disk");
}

function saveErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.includes("backup available")) return error.message;
  return error instanceof Error ? error.message : "保存失败。";
}

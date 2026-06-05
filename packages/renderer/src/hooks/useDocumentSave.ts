import { useCallback } from "react";
import { IpcChannel, type SaveDocumentResult } from "@wnote/contracts";
import { getSaveDefaultName } from "../files/file-state";
import type { DocumentTab } from "./useTabs";

export function useDocumentSave({
  getCurrentTab,
  getEditorContent,
  onSaved,
}: {
  getCurrentTab(): Pick<DocumentTab, "path">;
  getEditorContent(): Promise<string>;
  onSaved(result: SaveDocumentResult): void;
}) {
  return useCallback(
    async (saveAs = false) => {
      const tab = getCurrentTab();
      const content = await getEditorContent();
      const result = await window.electronAPI.invoke<SaveDocumentResult | null>(
        IpcChannel.FileSave,
        {
          filePath: saveAs ? undefined : tab.path,
          content,
          defaultName: getSaveDefaultName(tab.path),
        },
      );
      if (result) onSaved(result);
    },
    [getCurrentTab, getEditorContent, onSaved],
  );
}

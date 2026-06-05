import { useCallback, type RefObject } from "react";
import { IpcChannel, type OpenDocumentResult } from "@wnote/contracts";
import type { EditorRef } from "@wnote/editor-react";
import { shouldApplyOpenedDocument } from "../files/file-state";

export function useDocumentOpen({
  editorRef,
  getActiveTabId,
  openFile,
  setWindowTitle,
}: {
  editorRef: RefObject<EditorRef | null>;
  getActiveTabId(): string;
  openFile(path: string, content: string, assets: OpenDocumentResult["assets"]): string;
  setWindowTitle(title: string): void;
}) {
  const applyOpenedDocument = useCallback(
    (data: OpenDocumentResult) => {
      const tabId = openFile(data.filePath, data.content, data.assets);
      if (shouldApplyOpenedDocument(tabId, getActiveTabId())) {
        editorRef.current?.setContent(data.content);
        setWindowTitle(data.name);
      }
    },
    [editorRef, getActiveTabId, openFile, setWindowTitle],
  );

  const openDocumentDialog = useCallback(async () => {
    const data = await window.electronAPI.invoke<OpenDocumentResult | null>(IpcChannel.FileOpen);
    if (data) applyOpenedDocument(data);
    editorRef.current?.focus();
  }, [applyOpenedDocument, editorRef]);

  return { applyOpenedDocument, openDocumentDialog };
}

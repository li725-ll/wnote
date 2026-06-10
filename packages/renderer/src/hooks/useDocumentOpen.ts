import { useCallback, type RefObject } from "react";
import { IpcChannel, type OpenDocumentResult } from "@wnote/contracts";
import type { EditorRef } from "@wnote/editor-react";
import { shouldApplyOpenedDocument } from "../files/file-state";

export function useDocumentOpen({
  editorRef,
  getActiveTabId,
  onDocumentOpen,
  openFile,
  setWindowTitle,
}: {
  editorRef: RefObject<EditorRef | null>;
  getActiveTabId(): string;
  onDocumentOpen?: () => void;
  openFile(
    path: string,
    content: string,
    assets: OpenDocumentResult["assets"],
    stat: OpenDocumentResult["stat"],
  ): string;
  setWindowTitle(title: string): void;
}) {
  const applyOpenedDocument = useCallback(
    (data: OpenDocumentResult) => {
      onDocumentOpen?.();
      const tabId = openFile(data.filePath, data.content, data.assets, data.stat);
      if (shouldApplyOpenedDocument(tabId, getActiveTabId())) {
        editorRef.current?.setContent(data.content);
        setWindowTitle(data.name);
      }
    },
    [editorRef, getActiveTabId, onDocumentOpen, openFile, setWindowTitle],
  );

  const openDocumentDialog = useCallback(async () => {
    const data = await window.electronAPI.invoke<OpenDocumentResult | null>(IpcChannel.FileOpen);
    if (data) applyOpenedDocument(data);
    editorRef.current?.focus();
  }, [applyOpenedDocument, editorRef]);

  return { applyOpenedDocument, openDocumentDialog };
}

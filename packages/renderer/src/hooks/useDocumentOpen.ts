import { useCallback, type RefObject } from "react";
import { IpcChannel, type OpenDocumentResult } from "@wnote/contracts";
import type { EditorRef } from "@wnote/editor-react";

export function useDocumentOpen({
  editorRef,
  onDocumentOpen,
  openFile,
  setWindowTitle,
}: {
  editorRef: RefObject<EditorRef | null>;
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
      openFile(data.filePath, data.content, data.assets, data.stat);
      setWindowTitle(data.name);
    },
    [onDocumentOpen, openFile, setWindowTitle],
  );

  const openDocumentDialog = useCallback(async () => {
    const data = await window.electronAPI.invoke<OpenDocumentResult | null>(IpcChannel.FileOpen);
    if (data) applyOpenedDocument(data);
    editorRef.current?.focus();
  }, [applyOpenedDocument, editorRef]);

  return { applyOpenedDocument, openDocumentDialog };
}

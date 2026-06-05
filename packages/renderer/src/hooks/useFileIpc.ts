import { useEffect } from "react";
import { IpcChannel, type OpenDocumentResult } from "@wnote/contracts";

export function useFileIpc({
  onOpened,
  onNew,
  onClose,
}: {
  onOpened(data: OpenDocumentResult): void;
  onNew(): void;
  onClose(): void;
}) {
  useEffect(() => {
    const handler = (...args: unknown[]) => {
      onOpened(args[0] as OpenDocumentResult);
    };
    window.electronAPI.on(IpcChannel.FileOpened, handler);
    return () => window.electronAPI.off(IpcChannel.FileOpened, handler);
  }, [onOpened]);

  useEffect(() => {
    window.electronAPI
      .invoke<OpenDocumentResult | null>(IpcChannel.LastOpenedFileGet)
      .then((data) => {
        if (data) onOpened(data);
      });
  }, [onOpened]);

  useEffect(() => {
    window.electronAPI.on(IpcChannel.FileNew, onNew);
    return () => window.electronAPI.off(IpcChannel.FileNew, onNew);
  }, [onNew]);

  useEffect(() => {
    window.electronAPI.on(IpcChannel.FileClose, onClose);
    return () => window.electronAPI.off(IpcChannel.FileClose, onClose);
  }, [onClose]);
}

import { useEffect } from "react";
import { IpcChannel } from "@wnote/contracts";

export function useMenuActionIpc({
  onSave,
  onSaveAs,
  onExportHtml,
  onExportPdf,
}: {
  onSave(): void;
  onSaveAs(): void;
  onExportHtml(): void;
  onExportPdf(): void;
}) {
  useEffect(() => {
    return window.electronAPI.on(IpcChannel.FileSaveTrigger, onSave);
  }, [onSave]);

  useEffect(() => {
    return window.electronAPI.on(IpcChannel.FileSaveAsTrigger, onSaveAs);
  }, [onSaveAs]);

  useEffect(() => {
    return window.electronAPI.on(IpcChannel.ExportHtmlTrigger, onExportHtml);
  }, [onExportHtml]);

  useEffect(() => {
    return window.electronAPI.on(IpcChannel.ExportPdfTrigger, onExportPdf);
  }, [onExportPdf]);
}

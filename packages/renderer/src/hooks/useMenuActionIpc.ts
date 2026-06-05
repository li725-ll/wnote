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
    window.electronAPI.on(IpcChannel.FileSaveTrigger, onSave);
    return () => window.electronAPI.off(IpcChannel.FileSaveTrigger, onSave);
  }, [onSave]);

  useEffect(() => {
    window.electronAPI.on(IpcChannel.FileSaveAsTrigger, onSaveAs);
    return () => window.electronAPI.off(IpcChannel.FileSaveAsTrigger, onSaveAs);
  }, [onSaveAs]);

  useEffect(() => {
    window.electronAPI.on(IpcChannel.ExportHtmlTrigger, onExportHtml);
    return () => window.electronAPI.off(IpcChannel.ExportHtmlTrigger, onExportHtml);
  }, [onExportHtml]);

  useEffect(() => {
    window.electronAPI.on(IpcChannel.ExportPdfTrigger, onExportPdf);
    return () => window.electronAPI.off(IpcChannel.ExportPdfTrigger, onExportPdf);
  }, [onExportPdf]);
}

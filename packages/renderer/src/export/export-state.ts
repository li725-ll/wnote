import { IpcChannel, type ExportHtmlOptions } from "@wnote/contracts";
import type { ToastAction } from "../components/Toast";

export type ExportFormat = "html" | "pdf";

export const defaultExportOptions: Required<ExportHtmlOptions> = {
  inlineLocalImages: false,
  renderMermaid: true,
  theme: "light",
  pdf: {
    pageSize: "A4",
    orientation: "portrait",
    margin: "default",
    printBackground: true,
  },
};

export interface ExportDescriptor {
  format: ExportFormat;
  label: "HTML" | "PDF";
  extension: "html" | "pdf";
  defaultName: string;
  channel: typeof IpcChannel.ExportHtml | typeof IpcChannel.ExportPdf;
}

export function getExportBaseName(documentPath: string | null | undefined): string {
  const filename = documentPath?.split(/[/\\]/).pop();
  return filename?.replace(/\.[^.]+$/, "") || "untitled";
}

export function describeExport(
  format: ExportFormat,
  documentPath: string | null,
): ExportDescriptor {
  const label = format === "pdf" ? "PDF" : "HTML";
  const extension = format === "pdf" ? "pdf" : "html";
  return {
    format,
    label,
    extension,
    defaultName: `${getExportBaseName(documentPath)}.${extension}`,
    channel: format === "pdf" ? IpcChannel.ExportPdf : IpcChannel.ExportHtml,
  };
}

export interface ExportSuccessActionHandlers {
  showInFolder(filePath: string): void;
  openFile(filePath: string): void;
}

export function createExportSuccessActions(
  filePath: string,
  handlers: ExportSuccessActionHandlers,
): ToastAction[] {
  return [
    {
      label: "在 Finder 中显示",
      run: () => handlers.showInFolder(filePath),
    },
    {
      label: "打开文件",
      run: () => handlers.openFile(filePath),
    },
  ];
}

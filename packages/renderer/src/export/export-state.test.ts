import { describe, expect, it } from "vitest";
import { IpcChannel } from "@wnote/contracts";
import {
  createExportSuccessActions,
  defaultExportOptions,
  describeExport,
  getExportBaseName,
} from "./export-state";

describe("export state", () => {
  it("defines stable default export options", () => {
    expect(defaultExportOptions).toEqual({
      inlineLocalImages: false,
      renderMermaid: true,
      theme: "light",
      pdf: {
        pageSize: "A4",
        orientation: "portrait",
        margin: "default",
        printBackground: true,
      },
    });
  });

  it("derives export base names from document paths", () => {
    expect(getExportBaseName("/Users/lmx/docs/note.md")).toBe("note");
    expect(getExportBaseName("C:\\docs\\note.markdown")).toBe("note");
    expect(getExportBaseName("/Users/lmx/docs/archive.v1.md")).toBe("archive.v1");
    expect(getExportBaseName(null)).toBe("untitled");
    expect(getExportBaseName(undefined)).toBe("untitled");
  });

  it("describes HTML exports", () => {
    expect(describeExport("html", "/docs/report.md")).toEqual({
      format: "html",
      label: "HTML",
      extension: "html",
      defaultName: "report.html",
      channel: IpcChannel.ExportHtml,
    });
  });

  it("describes PDF exports", () => {
    expect(describeExport("pdf", null)).toEqual({
      format: "pdf",
      label: "PDF",
      extension: "pdf",
      defaultName: "untitled.pdf",
      channel: IpcChannel.ExportPdf,
    });
  });

  it("creates export success actions", () => {
    const calls: string[] = [];
    const actions = createExportSuccessActions("/tmp/report.pdf", {
      showInFolder: (filePath) => calls.push(`show:${filePath}`),
      openFile: (filePath) => calls.push(`open:${filePath}`),
    });

    expect(actions.map((action) => action.label)).toEqual(["在 Finder 中显示", "打开文件"]);
    actions[0]?.run();
    actions[1]?.run();
    expect(calls).toEqual(["show:/tmp/report.pdf", "open:/tmp/report.pdf"]);
  });
});

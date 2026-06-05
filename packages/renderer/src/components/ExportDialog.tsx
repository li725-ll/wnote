import { useEffect, useState } from "react";
import type { ExportHtmlOptions } from "@wnote/contracts";
import styles from "./ExportDialog.module.css";

export type ExportFormat = "html" | "pdf";

interface ExportDialogProps {
  open: boolean;
  format: ExportFormat;
  initialOptions: Required<ExportHtmlOptions>;
  onCancel(): void;
  onConfirm(format: ExportFormat, options: Required<ExportHtmlOptions>): void;
  onPreview(format: ExportFormat, options: Required<ExportHtmlOptions>): void;
}

export function ExportDialog({
  open,
  format,
  initialOptions,
  onCancel,
  onConfirm,
  onPreview,
}: ExportDialogProps) {
  const [options, setOptions] = useState(initialOptions);
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>(format);

  useEffect(() => {
    if (!open) return;
    setOptions(initialOptions);
    setSelectedFormat(format);
  }, [format, initialOptions, open]);

  useEffect(() => {
    if (!open) return;
    const handler = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter")
        onConfirm(selectedFormat, options);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel, onConfirm, open, options, selectedFormat]);

  if (!open) return null;

  return (
    <div className={styles.overlay} role="presentation" onMouseDown={onCancel}>
      <section
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-html-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="export-html-title" className={styles.title}>
            导出为 HTML
          </h2>
          <p className={styles.description}>选择本次导出的渲染和资源策略。</p>
        </header>
        <div className={styles.body}>
          <div className={styles.option}>
            <span className={styles.optionText}>
              <span className={styles.label}>导出格式</span>
              <span className={styles.hint}>HTML 适合分享和二次编辑，PDF 适合打印和归档。</span>
            </span>
            <div className={styles.segment} role="group" aria-label="导出格式">
              <button
                className={styles.segmentButton}
                data-active={selectedFormat === "html"}
                type="button"
                onClick={() => setSelectedFormat("html")}
              >
                HTML
              </button>
              <button
                className={styles.segmentButton}
                data-active={selectedFormat === "pdf"}
                type="button"
                onClick={() => setSelectedFormat("pdf")}
              >
                PDF
              </button>
            </div>
          </div>
          {selectedFormat === "pdf" ? (
            <div className={styles.pdfOptions}>
              <div className={styles.option}>
                <span className={styles.optionText}>
                  <span className={styles.label}>纸张尺寸</span>
                  <span className={styles.hint}>选择 PDF 页面规格。</span>
                </span>
                <div className={styles.segment} role="group" aria-label="纸张尺寸">
                  <button
                    className={styles.segmentButton}
                    data-active={options.pdf.pageSize === "A4"}
                    type="button"
                    onClick={() =>
                      setOptions((current) => ({
                        ...current,
                        pdf: { ...current.pdf, pageSize: "A4" },
                      }))
                    }
                  >
                    A4
                  </button>
                  <button
                    className={styles.segmentButton}
                    data-active={options.pdf.pageSize === "Letter"}
                    type="button"
                    onClick={() =>
                      setOptions((current) => ({
                        ...current,
                        pdf: { ...current.pdf, pageSize: "Letter" },
                      }))
                    }
                  >
                    Letter
                  </button>
                </div>
              </div>
              <div className={styles.option}>
                <span className={styles.optionText}>
                  <span className={styles.label}>方向</span>
                  <span className={styles.hint}>选择纵向或横向导出。</span>
                </span>
                <div className={styles.segment} role="group" aria-label="PDF 方向">
                  <button
                    className={styles.segmentButton}
                    data-active={options.pdf.orientation === "portrait"}
                    type="button"
                    onClick={() =>
                      setOptions((current) => ({
                        ...current,
                        pdf: { ...current.pdf, orientation: "portrait" },
                      }))
                    }
                  >
                    纵向
                  </button>
                  <button
                    className={styles.segmentButton}
                    data-active={options.pdf.orientation === "landscape"}
                    type="button"
                    onClick={() =>
                      setOptions((current) => ({
                        ...current,
                        pdf: { ...current.pdf, orientation: "landscape" },
                      }))
                    }
                  >
                    横向
                  </button>
                </div>
              </div>
              <div className={styles.option}>
                <span className={styles.optionText}>
                  <span className={styles.label}>页边距</span>
                  <span className={styles.hint}>控制页面留白。</span>
                </span>
                <div
                  className={`${styles.segment} ${styles.threeSegment}`}
                  role="group"
                  aria-label="PDF 页边距"
                >
                  {(["compact", "default", "wide"] as const).map((margin) => (
                    <button
                      key={margin}
                      className={styles.segmentButton}
                      data-active={options.pdf.margin === margin}
                      type="button"
                      onClick={() =>
                        setOptions((current) => ({
                          ...current,
                          pdf: { ...current.pdf, margin },
                        }))
                      }
                    >
                      {margin === "compact" ? "紧凑" : margin === "wide" ? "宽松" : "默认"}
                    </button>
                  ))}
                </div>
              </div>
              <label className={styles.option}>
                <span className={styles.optionText}>
                  <span className={styles.label}>打印背景</span>
                  <span className={styles.hint}>保留代码块、表格和深色主题背景。</span>
                </span>
                <input
                  className={styles.checkbox}
                  type="checkbox"
                  checked={options.pdf.printBackground}
                  onChange={(event) =>
                    setOptions((current) => ({
                      ...current,
                      pdf: { ...current.pdf, printBackground: event.target.checked },
                    }))
                  }
                />
              </label>
            </div>
          ) : null}
          <label className={styles.option}>
            <span className={styles.optionText}>
              <span className={styles.label}>内联本地图片</span>
              <span className={styles.hint}>将本地图片写入 HTML，文件更独立但体积更大。</span>
            </span>
            <input
              className={styles.checkbox}
              type="checkbox"
              checked={options.inlineLocalImages}
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  inlineLocalImages: event.target.checked,
                }))
              }
            />
          </label>
          <label className={styles.option}>
            <span className={styles.optionText}>
              <span className={styles.label}>渲染 Mermaid</span>
              <span className={styles.hint}>导出文件会加载 Mermaid 脚本渲染图表。</span>
            </span>
            <input
              className={styles.checkbox}
              type="checkbox"
              checked={options.renderMermaid}
              onChange={(event) =>
                setOptions((current) => ({
                  ...current,
                  renderMermaid: event.target.checked,
                }))
              }
            />
          </label>
          <div className={styles.option}>
            <span className={styles.optionText}>
              <span className={styles.label}>导出主题</span>
              <span className={styles.hint}>影响页面样式和代码高亮主题。</span>
            </span>
            <div className={styles.segment} role="group" aria-label="导出主题">
              <button
                className={styles.segmentButton}
                data-active={options.theme === "light"}
                type="button"
                onClick={() => setOptions((current) => ({ ...current, theme: "light" }))}
              >
                浅色
              </button>
              <button
                className={styles.segmentButton}
                data-active={options.theme === "dark"}
                type="button"
                onClick={() => setOptions((current) => ({ ...current, theme: "dark" }))}
              >
                深色
              </button>
            </div>
          </div>
        </div>
        <footer className={styles.footer}>
          <button className={styles.button} type="button" onClick={onCancel}>
            取消
          </button>
          <button
            className={styles.button}
            type="button"
            onClick={() => onPreview(selectedFormat, options)}
          >
            预览
          </button>
          <button
            className={`${styles.button} ${styles.primary}`}
            type="button"
            onClick={() => onConfirm(selectedFormat, options)}
          >
            导出
          </button>
        </footer>
      </section>
    </div>
  );
}

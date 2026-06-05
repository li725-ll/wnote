import CodeBlockLowlight from "@tiptap/extension-code-block";
import { mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import styles from "./CodeBlock.module.css";

export const CodeBlock = CodeBlockLowlight.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      language: {
        default: null,
        parseHTML: (element) => {
          const code = element.querySelector("code");
          const className = code?.getAttribute("class") ?? "";
          return className.match(/language-([A-Za-z0-9_-]+)/)?.[1] ?? null;
        },
        rendered: false,
      },
    };
  },

  renderHTML({ node, HTMLAttributes }) {
    const language = node.attrs.language as string | null;
    return [
      "pre",
      mergeAttributes(HTMLAttributes, { "data-language": language }),
      ["code", language ? { class: `language-${language}` } : {}, 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CodeBlockView);
  },
});

function CodeBlockView({ node, selected, updateAttributes }: NodeViewProps) {
  const language = normalizeLanguage(node.attrs.language);
  const code = node.textContent;
  const [html, setHtml] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let disposed = false;
    setError(null);
    setHtml("");

    void import("@wnote/renderers/shiki")
      .then(({ highlight }) => highlight(code, language || "text", "light"))
      .then((result) => {
        if (!disposed) setHtml(result);
      })
      .catch((reason: unknown) => {
        if (disposed) return;
        setError(reason instanceof Error ? reason.message : "Highlight failed");
      });

    return () => {
      disposed = true;
    };
  }, [code, language]);

  const label = useMemo(() => language || "text", [language]);

  return (
    <NodeViewWrapper className={styles.wrapper} data-selected={selected ? "true" : "false"}>
      <div className={styles.header} contentEditable={false}>
        <input
          className={styles.language}
          value={label}
          spellCheck={false}
          aria-label="Code language"
          onChange={(event) => {
            updateAttributes({ language: normalizeLanguage(event.target.value) });
          }}
          onFocus={(event) => event.currentTarget.select()}
        />
      </div>
      <div className={styles.body}>
        {html ? (
          <div
            className={styles.highlight}
            contentEditable={false}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : (
          <pre className={styles.highlightFallback} aria-hidden="true">
            <code>{code}</code>
          </pre>
        )}
        <NodeViewContent className={styles.content} />
      </div>
      {error ? (
        <div className={styles.error} contentEditable={false}>
          {error}
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

function normalizeLanguage(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized || null;
}

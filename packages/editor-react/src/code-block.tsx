import CodeBlockLowlight from "@tiptap/extension-code-block";
import { mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useMemo, useState } from "react";
import {
  errorRenderState,
  loadingRenderState,
  readyRenderState,
  type AsyncRenderState,
} from "./async-render-state";
import { copyCodeBlockText } from "./code-block-utils";
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
  const [renderState, setRenderState] = useState<AsyncRenderState>(loadingRenderState);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  useEffect(() => {
    let disposed = false;
    setRenderState(loadingRenderState);

    void import("@wnote/renderers/shiki")
      .then(({ highlight }) => highlight(code, language || "text", "light"))
      .then((result) => {
        if (!disposed) setRenderState(readyRenderState(result));
      })
      .catch((reason: unknown) => {
        if (disposed) return;
        setRenderState(errorRenderState(reason, "Highlight failed"));
      });

    return () => {
      disposed = true;
    };
  }, [code, language]);

  const label = useMemo(() => language || "text", [language]);

  return (
    <NodeViewWrapper className={styles.wrapper} data-selected={selected ? "true" : "false"}>
      <div className={styles.header} contentEditable={false}>
        <button
          className={styles.copyButton}
          type="button"
          title="复制代码"
          onClick={() => {
            void copyCodeBlockText(code)
              .then((copied) => setCopyState(copied ? "copied" : "failed"))
              .catch(() => setCopyState("failed"));
          }}
        >
          {copyState === "copied" ? "Copied" : copyState === "failed" ? "Failed" : "Copy"}
        </button>
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
        {renderState.status === "ready" ? (
          <div
            className={styles.highlight}
            contentEditable={false}
            dangerouslySetInnerHTML={{ __html: renderState.html }}
          />
        ) : (
          <pre className={styles.highlightFallback} aria-hidden="true">
            <code>{code}</code>
          </pre>
        )}
        <NodeViewContent className={styles.content} />
      </div>
      {renderState.error ? (
        <div className={styles.error} contentEditable={false}>
          {renderState.error}
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

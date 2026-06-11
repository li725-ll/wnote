import CodeBlockLowlight from "@tiptap/extension-code-block";
import { mergeAttributes } from "@tiptap/core";
import { NodeViewContent, NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  errorRenderState,
  loadingRenderState,
  readyRenderState,
  type AsyncRenderState,
} from "./async-render-state";
import {
  codeLanguageLabel,
  commonCodeLanguages,
  copyButtonLabel,
  copyCodeBlockText,
  normalizeCodeLanguage,
} from "./code-block-utils";
import { withNodeViewErrorBoundary } from "./NodeViewErrorBoundary";
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
    return ReactNodeViewRenderer(withNodeViewErrorBoundary(CodeBlockView));
  },

  addKeyboardShortcuts() {
    return {
      Tab: () => {
        if (!this.editor.isActive("codeBlock")) return false;
        return this.editor.commands.insertContent("\t");
      },
      "Shift-Tab": () => {
        if (!this.editor.isActive("codeBlock")) return false;
        const { from } = this.editor.state.selection;
        const lineStart = lineStartBefore(this.editor.state.doc, from);
        const nextChar = this.editor.state.doc.textBetween(lineStart, lineStart + 1, "\n", "\n");
        if (nextChar === "\t") {
          return this.editor.commands.deleteRange({ from: lineStart, to: lineStart + 1 });
        }
        const nextSpaces = this.editor.state.doc.textBetween(lineStart, lineStart + 2, "\n", "\n");
        if (nextSpaces === "  ") {
          return this.editor.commands.deleteRange({ from: lineStart, to: lineStart + 2 });
        }
        return true;
      },
    };
  },
});

function lineStartBefore(doc: NodeViewProps["node"], pos: number): number {
  const $pos = doc.resolve(pos);
  const blockStart = $pos.start($pos.depth);
  const before = doc.textBetween(blockStart, pos, "\n", "\n");
  return blockStart + before.lastIndexOf("\n") + 1;
}

function CodeBlockView({ node, selected, updateAttributes }: NodeViewProps) {
  const language = normalizeCodeLanguage(node.attrs.language);
  const code = node.textBetween(0, node.content.size, "\n");
  const [renderState, setRenderState] = useState<AsyncRenderState>(loadingRenderState);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const highlightRequestRef = useRef(0);

  useEffect(() => {
    let disposed = false;
    const requestId = highlightRequestRef.current + 1;
    highlightRequestRef.current = requestId;
    setRenderState((current) => (current.status === "ready" ? current : loadingRenderState));

    const timeout = window.setTimeout(() => {
      void import("@wnote/renderers/shiki")
        .then(({ highlight }) => highlight(code, language || "text", "light"))
        .then((result) => {
          if (!disposed && highlightRequestRef.current === requestId) {
            setRenderState(readyRenderState(result));
          }
        })
        .catch((reason: unknown) => {
          if (disposed || highlightRequestRef.current !== requestId) return;
          setRenderState(errorRenderState(reason, "Highlight failed"));
        });
    }, 160);

    return () => {
      disposed = true;
      window.clearTimeout(timeout);
    };
  }, [code, language]);

  useEffect(() => {
    if (copyState === "idle") return;
    const timeout = window.setTimeout(() => setCopyState("idle"), 1400);
    return () => window.clearTimeout(timeout);
  }, [copyState]);

  const label = useMemo(() => codeLanguageLabel(language), [language]);

  return (
    <NodeViewWrapper className={styles.wrapper} data-selected={selected ? "true" : "false"}>
      <div className={styles.header} contentEditable={false}>
        <button
          className={styles.copyButton}
          data-state={copyState}
          disabled={!code}
          type="button"
          title={copyButtonLabel(copyState)}
          aria-label={copyButtonLabel(copyState)}
          onClick={() => {
            void copyCodeBlockText(code)
              .then((copied) => setCopyState(copied ? "copied" : "failed"))
              .catch(() => setCopyState("failed"));
          }}
        />
        <input
          className={styles.language}
          value={label}
          spellCheck={false}
          aria-label="Code language"
          onChange={(event) => {
            updateAttributes({ language: normalizeCodeLanguage(event.target.value) });
          }}
          onFocus={(event) => event.currentTarget.select()}
        />
      </div>
      {selected ? (
        <div className={styles.presets} contentEditable={false}>
          {commonCodeLanguages.map((preset) => {
            const presetLanguage = normalizeCodeLanguage(preset);
            return (
              <button
                key={preset}
                className={styles.presetButton}
                data-active={language === presetLanguage ? "true" : "false"}
                type="button"
                onClick={() => updateAttributes({ language: presetLanguage })}
              >
                {preset}
              </button>
            );
          })}
        </div>
      ) : null}
      <div className={styles.body}>
        {renderState.status === "ready" ? (
          <div
            className={styles.highlight}
            data-code-block-layer="highlight"
            contentEditable={false}
            dangerouslySetInnerHTML={{ __html: renderState.html }}
          />
        ) : (
          <pre
            className={styles.highlightFallback}
            data-code-block-layer="highlight"
            aria-hidden="true"
          >
            <code>{code}</code>
          </pre>
        )}
        <NodeViewContent className={styles.content} data-code-block-layer="content" />
        {!code ? (
          <div className={styles.placeholder} contentEditable={false}>
            输入代码
          </div>
        ) : null}
      </div>
      {renderState.error ? (
        <div className={styles.error} contentEditable={false}>
          {renderState.error}
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

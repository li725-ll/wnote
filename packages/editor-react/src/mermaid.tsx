import { mergeAttributes, Node } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer } from "@tiptap/react";
import type { NodeViewProps } from "@tiptap/react";
import { useEffect, useId, useState } from "react";
import {
  errorRenderState,
  idleRenderState,
  loadingRenderState,
  readyRenderState,
  type AsyncRenderState,
} from "./async-render-state";
import styles from "./Mermaid.module.css";

const defaultDiagram = "graph TD\n  A --> B";

export const MermaidBlock = Node.create({
  name: "mermaidBlock",
  group: "block",
  atom: true,
  selectable: true,
  defining: true,

  addAttributes() {
    return {
      source: {
        default: defaultDiagram,
        parseHTML: (element) =>
          element.getAttribute("data-mermaid-block") ?? element.textContent ?? defaultDiagram,
        renderHTML: (attributes) => ({ "data-mermaid-block": attributes.source }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-mermaid-block]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes), HTMLAttributes["data-mermaid-block"] ?? ""];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MermaidView);
  },
});

function MermaidView({ node, selected, updateAttributes }: NodeViewProps) {
  const source = String(node.attrs.source ?? "");
  const id = useStableMermaidId();
  const [editing, setEditing] = useState(!source.trim());
  const [renderState, setRenderState] = useState<AsyncRenderState>(idleRenderState);

  useEffect(() => {
    let disposed = false;
    setRenderState(loadingRenderState);

    if (!source.trim()) {
      setRenderState(idleRenderState);
      return;
    }

    void import("@wnote/renderers/mermaid")
      .then(({ renderDiagram }) => renderDiagram(source, id, "default"))
      .then((result) => {
        if (!disposed) setRenderState(readyRenderState(result));
      })
      .catch((reason: unknown) => {
        if (!disposed) setRenderState(errorRenderState(reason, "Mermaid render failed"));
      });

    return () => {
      disposed = true;
    };
  }, [source, id]);

  return (
    <NodeViewWrapper
      className={styles.wrapper}
      data-selected={selected ? "true" : "false"}
      onClick={() => setEditing(true)}
    >
      <div className={styles.header} contentEditable={false}>
        mermaid
      </div>
      {editing ? (
        <textarea
          className={styles.input}
          value={source}
          rows={Math.max(4, source.split("\n").length)}
          spellCheck={false}
          autoFocus
          onChange={(event) => updateAttributes({ source: event.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              setEditing(false);
            }
          }}
        />
      ) : (
        <div className={styles.preview} contentEditable={false}>
          {renderState.status === "ready" ? (
            <div dangerouslySetInnerHTML={{ __html: renderState.html }} />
          ) : (
            <pre>{source}</pre>
          )}
        </div>
      )}
      {renderState.error ? (
        <div className={styles.error} contentEditable={false}>
          {renderState.error}
        </div>
      ) : null}
    </NodeViewWrapper>
  );
}

function useStableMermaidId(): string {
  return useId().replace(/[^A-Za-z0-9_-]/g, "");
}

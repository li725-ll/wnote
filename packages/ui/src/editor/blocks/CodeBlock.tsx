import { useState, useEffect } from "react";
import type { BlockNode } from "@wnote/md-parser";
import { useEditor } from "../context";
import { highlight } from "../enhancers/shiki";
import { renderDiagram } from "../enhancers/mermaid";
import { renderBlockMath } from "../enhancers/katex";
import styles from "./CodeBlock.module.css";

interface CodeBlockProps {
  node: Extract<BlockNode, { type: "codeBlock" }>;
}

export function CodeBlock({ node }: CodeBlockProps) {
  const { state } = useEditor();
  const [html, setHtml] = useState<string | null>(null);
  const { lang, code } = node;

  useEffect(() => {
    let cancelled = false;

    if (lang === "mermaid") {
      const id = crypto.randomUUID().slice(0, 8);
      renderDiagram(code, id)
        .then((svg) => {
          if (!cancelled) setHtml(svg);
        })
        .catch(() => {
          if (!cancelled) setHtml(null);
        });
    } else if (lang === "math" || lang === "latex") {
      setHtml(renderBlockMath(code));
    } else {
      highlight(code, lang ?? "text", state.theme)
        .then((result) => {
          if (!cancelled) setHtml(result);
        })
        .catch(() => {
          if (!cancelled) setHtml(null);
        });
    }

    return () => {
      cancelled = true;
    };
  }, [code, lang, state.theme]);

  if (lang === "mermaid" && html) {
    return <div className={styles.mermaid} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if ((lang === "math" || lang === "latex") && html) {
    return <div className={styles.math} dangerouslySetInnerHTML={{ __html: html }} />;
  }

  if (html) {
    return (
      <div className={styles.codeBlock}>
        {lang && <span className={styles.lang}>{lang}</span>}
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    );
  }

  return (
    <div className={styles.codeBlock}>
      {lang && <span className={styles.lang}>{lang}</span>}
      <pre>
        <code>{code}</code>
      </pre>
    </div>
  );
}

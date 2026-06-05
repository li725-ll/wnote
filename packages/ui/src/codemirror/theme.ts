import { EditorView } from "@codemirror/view";
import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

export const codeHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: "var(--hl-keyword)" },
  { tag: [tags.name, tags.deleted, tags.character, tags.macroName], color: "var(--hl-name)" },
  { tag: [tags.function(tags.variableName), tags.labelName], color: "var(--hl-function)" },
  {
    tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)],
    color: "var(--hl-constant)",
  },
  { tag: [tags.definition(tags.name), tags.separator], color: "var(--hl-name)" },
  {
    tag: [
      tags.typeName,
      tags.className,
      tags.changed,
      tags.annotation,
      tags.modifier,
      tags.self,
      tags.namespace,
    ],
    color: "var(--hl-type)",
  },
  { tag: [tags.number, tags.bool], color: "var(--hl-number)" },
  {
    tag: [
      tags.operator,
      tags.operatorKeyword,
      tags.url,
      tags.escape,
      tags.regexp,
      tags.special(tags.string),
    ],
    color: "var(--hl-operator)",
  },
  { tag: [tags.string, tags.processingInstruction, tags.inserted], color: "var(--hl-string)" },
  { tag: [tags.meta, tags.comment], color: "var(--hl-comment)", fontStyle: "italic" },
  { tag: tags.strong, fontWeight: "bold" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: tags.link, color: "var(--color-link)", textDecoration: "underline" },
  { tag: tags.heading, fontWeight: "bold" },
  { tag: tags.atom, color: "var(--hl-constant)" },
  { tag: tags.propertyName, color: "var(--hl-property)" },
  { tag: tags.punctuation, color: "var(--hl-punctuation)" },
  { tag: tags.list, color: "var(--color-text)" },
]);

export const wnoteTheme = EditorView.theme({
  "&": {
    height: "100%",
    fontSize: "var(--editor-font-size)",
    fontFamily: "var(--editor-font)",
    color: "var(--color-text)",
    backgroundColor: "var(--color-bg)",
  },
  ".cm-content": {
    maxWidth: "var(--editor-max-width)",
    margin: "0 auto",
    padding: "2.5rem 2rem",
    fontFamily: "var(--editor-font)",
    lineHeight: "var(--editor-line-height)",
    caretColor: "var(--color-text)",
  },
  ".cm-cursor": {
    borderLeftColor: "var(--color-text)",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "var(--color-focus-ring)",
    opacity: "0.2",
  },
  ".cm-activeLine": {
    backgroundColor: "transparent",
  },
  ".cm-gutters": {
    display: "none",
  },
  ".cm-scroller": {
    overflow: "auto",
    fontFamily: "var(--editor-font)",
  },
  ".cm-placeholder": {
    color: "var(--color-placeholder)",
    fontFamily: "var(--editor-font)",
  },

  // Headings
  ".cm-md-heading1": {
    fontSize: "1.75em",
    fontWeight: "600",
    lineHeight: "1.4",
    margin: "0.5em 0 0.2em",
  },
  ".cm-md-heading2": {
    fontSize: "1.4em",
    fontWeight: "600",
    lineHeight: "1.4",
    margin: "0.4em 0 0.2em",
  },
  ".cm-md-heading3": {
    fontSize: "1.15em",
    fontWeight: "600",
    lineHeight: "1.4",
    margin: "0.3em 0 0.1em",
  },
  ".cm-md-heading4": { fontSize: "1em", fontWeight: "600", lineHeight: "1.4" },

  // Inline formatting
  ".cm-md-bold": { fontWeight: "700" },
  ".cm-md-italic": { fontStyle: "italic" },
  ".cm-md-code": {
    fontFamily: "var(--editor-mono-font)",
    fontSize: "0.9em",
    backgroundColor: "var(--color-code-bg)",
    borderRadius: "3px",
    padding: "0.15em 0.3em",
  },
  ".cm-md-link": {
    color: "var(--color-link)",
    textDecoration: "none",
    cursor: "pointer",
  },
  ".cm-md-link:hover": {
    textDecoration: "underline",
  },

  // Syntax markers (shown in light gray when active)
  ".cm-md-syntax": {
    color: "var(--color-placeholder)",
    fontWeight: "normal",
    fontStyle: "normal",
    fontSize: "0.9em",
    animation: "syntaxFadeIn 0.15s ease-out",
  },

  "@keyframes syntaxFadeIn": {
    from: { opacity: "0" },
    to: { opacity: "1" },
  },

  // Smooth padding transition for list indentation
  ".cm-line": {
    fontFamily: "var(--editor-font)",
    transition: "padding-left 0.15s ease",
  },

  // Horizontal rule
  ".cm-md-hr": {
    display: "block",
    height: "1px",
    backgroundColor: "var(--color-hr)",
    margin: "1.5em 0",
    border: "none",
  },

  // Blockquote
  ".cm-md-blockquote-line": {
    borderLeft: "3px solid var(--color-blockquote-border)",
    paddingLeft: "1em",
    opacity: "0.9",
  },

  // Table
  ".cm-md-table-wrapper": {
    margin: "0.5em 0",
    overflowX: "auto",
  },
  ".cm-md-table": {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "0.9em",
    "& th, & td": {
      border: "1px solid var(--color-table-border)",
      padding: "0.4em 0.8em",
    },
    "& th": {
      backgroundColor: "var(--color-table-header-bg)",
      fontWeight: "600",
    },
    "& code": {
      fontFamily: "var(--editor-mono-font)",
      fontSize: "0.9em",
      backgroundColor: "var(--color-code-bg)",
      borderRadius: "3px",
      padding: "0.1em 0.25em",
    },
  },
  ".cm-md-table-line": {
    backgroundColor: "var(--color-code-bg)",
    fontFamily: "var(--editor-mono-font)",
    fontSize: "0.9em",
  },
  ".cm-md-table-hidden-line": {
    fontSize: "0",
    lineHeight: "0",
    height: "0",
    overflow: "hidden",
    padding: "0 !important",
  },

  // Fenced code block
  ".cm-md-codeblock-line": {
    backgroundColor: "var(--color-code-bg)",
    fontFamily: "var(--editor-mono-font)",
    fontSize: "0.9em",
    padding: "0 1em",
    overflowWrap: "anywhere",
  },
  ".cm-md-codeblock-first": {
    borderTopLeftRadius: "8px",
    borderTopRightRadius: "8px",
    paddingTop: "0.6em",
  },
  ".cm-md-codeblock-last": {
    borderBottomLeftRadius: "8px",
    borderBottomRightRadius: "8px",
    paddingBottom: "0.4em",
  },
  ".cm-md-codeblock-lang": {
    display: "inline-block",
    color: "var(--color-placeholder)",
    fontSize: "0.75em",
    fontFamily: "var(--editor-mono-font)",
    padding: "0.1em 0.5em",
    borderRadius: "3px",
    backgroundColor: "var(--color-hover-bg)",
  },
  ".cm-md-codeblock-fence-end": {
    fontSize: "0",
    lineHeight: "0",
    height: "0",
    overflow: "hidden",
    padding: "0",
  },

  // Mermaid diagram
  ".cm-md-mermaid-hidden-line": {
    fontSize: "0",
    lineHeight: "0",
    height: "0",
    overflow: "hidden",
    padding: "0 !important",
  },
  ".cm-md-mermaid": {
    display: "flex",
    justifyContent: "center",
    maxWidth: "100%",
    margin: "0.5em 0",
    padding: "1em",
    overflowX: "auto",
    backgroundColor: "var(--color-code-bg)",
    borderRadius: "8px",
  },
  ".cm-md-mermaid svg": {
    maxWidth: "100%",
    height: "auto",
  },
  ".cm-md-mermaid-loading": {
    color: "var(--color-placeholder)",
    fontSize: "0.85em",
    fontFamily: "var(--editor-mono-font)",
  },
  ".cm-md-mermaid-error": {
    display: "block",
    color: "var(--color-text)",
  },
  ".cm-md-mermaid-error-message": {
    marginBottom: "0.75em",
    color: "var(--color-placeholder)",
    fontFamily: "var(--editor-mono-font)",
    fontSize: "0.85em",
    whiteSpace: "pre-wrap",
  },
  ".cm-md-mermaid-error pre": {
    margin: "0",
    overflowX: "auto",
    fontFamily: "var(--editor-mono-font)",
    fontSize: "0.85em",
    lineHeight: "1.5",
    whiteSpace: "pre-wrap",
  },

  // Task list checkbox
  ".cm-md-checkbox": {
    width: "1em",
    height: "1em",
    verticalAlign: "middle",
    marginRight: "0.4em",
    cursor: "pointer",
    accentColor: "var(--color-focus-ring)",
  },

  // List bullet
  ".cm-md-list-bullet": {
    color: "var(--color-placeholder)",
    fontSize: "1.2em",
    lineHeight: "1",
  },

  // List number (ordered)
  ".cm-md-list-number": {
    color: "var(--color-text)",
  },

  // List indentation levels
  ".cm-md-list-indent-1": { paddingLeft: "2em" },
  ".cm-md-list-indent-2": { paddingLeft: "4em" },
  ".cm-md-list-indent-3": { paddingLeft: "6em" },
  ".cm-md-list-indent-4": { paddingLeft: "8em" },

  // Image preview
  ".cm-md-image-line": {
    lineHeight: "0 !important",
    padding: "0 !important",
    minHeight: "0 !important",
  },
  ".cm-md-image": {
    display: "block",
    margin: "-0.75em 0",
  },
  ".cm-md-image img": {
    display: "block",
    maxWidth: "100%",
    maxHeight: "400px",
    borderRadius: "6px",
    objectFit: "contain",
  },
  ".cm-md-image-error": {
    lineHeight: "1.5",
    color: "var(--color-placeholder)",
    fontStyle: "italic",
  },
});

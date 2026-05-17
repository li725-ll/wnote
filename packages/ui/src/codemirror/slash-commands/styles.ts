import { EditorView } from "@codemirror/view";

export const slashCommandStyles = EditorView.theme({
  ".cm-tooltip": {
    "&:has(.cm-slash-menu)": {
      border: "none",
      background: "transparent",
      boxShadow: "none",
    },
  },
  ".cm-slash-menu": {
    width: "240px",
    maxHeight: "280px",
    overflowY: "auto",
    overflowX: "hidden",
    background: "var(--color-bg, #fff)",
    border: "1px solid var(--sidebar-border, #e5e5e5)",
    borderRadius: "8px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
    padding: "4px",
    fontSize: "14px",
    animation: "slashFadeIn 0.12s ease-out",
  },
  ".cm-slash-item": {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "6px 8px",
    borderRadius: "4px",
    cursor: "pointer",
    color: "var(--color-text, #1a1a1a)",
    transition: "background 0.1s",
  },
  ".cm-slash-item:hover, .cm-slash-selected": {
    background: "var(--color-hover-bg, rgba(0,0,0,0.04))",
  },
  ".cm-slash-selected": {
    background: "var(--color-hover-bg, rgba(0,0,0,0.04))",
  },
  ".cm-slash-icon": {
    width: "24px",
    height: "24px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--color-placeholder, #999)",
    flexShrink: "0",
  },
  ".cm-slash-trigger": {
    fontFamily: "var(--editor-mono-font, monospace)",
    fontSize: "0.85em",
    color: "var(--color-text, #1a1a1a)",
    minWidth: "4em",
  },
  ".cm-slash-label": {
    flex: "1",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    color: "var(--color-placeholder, #999)",
    marginLeft: "0.5em",
  },
  ".cm-slash-empty": {
    padding: "12px 8px",
    color: "var(--color-placeholder, #999)",
    textAlign: "center",
    fontSize: "13px",
  },
  "@keyframes slashFadeIn": {
    from: { opacity: "0", transform: "translateY(-4px)" },
    to: { opacity: "1", transform: "translateY(0)" },
  },
});

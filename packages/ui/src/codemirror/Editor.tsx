import { useRef, useEffect, useImperativeHandle, useState, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, placeholder as cmPlaceholder } from "@codemirror/view";
import { keymap, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language";
import { wnoteTheme, codeHighlightStyle } from "./theme";
import { markdownPreview, tablePreview } from "./markdown-preview";
import { codeBlockCompletion } from "./code-block";
import { markdownKeybindings } from "./keybindings";
import { extractHeadings, type HeadingItem } from "./headings";
import { slashCommands } from "./slash-commands";
import { imagePaste, type ImageSaveHandler } from "./image-paste";
import { ContextMenu } from "./ContextMenu";
import styles from "./Editor.module.css";

export type { HeadingItem };

export interface EditorProps {
  initialContent?: string;
  onChange?: (markdown: string) => void;
  onHeadingsChange?: (headings: HeadingItem[]) => void;
  onImageSave?: ImageSaveHandler;
  placeholder?: string;
  ref?: React.Ref<EditorRef>;
}

export interface EditorRef {
  getContent(): string;
  setContent(md: string): void;
  replaceRange(from: number, to: number, text: string): void;
  insertAt(pos: number, text: string): void;
  getSelection(): { from: number; to: number; text: string };
  replaceSelection(text: string): void;
  scrollToPos(pos: number): void;
  focus(): void;
  getView(): EditorView | null;
}

export function Editor({
  initialContent = "",
  onChange,
  onHeadingsChange,
  onImageSave,
  placeholder = "开始写作...",
  ref,
}: EditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const onHeadingsChangeRef = useRef(onHeadingsChange);
  const onImageSaveRef = useRef(onImageSave);
  onChangeRef.current = onChange;
  onHeadingsChangeRef.current = onHeadingsChange;
  onImageSaveRef.current = onImageSave;

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useImperativeHandle(ref, () => ({
    getContent() {
      return viewRef.current?.state.doc.toString() ?? "";
    },
    setContent(md: string) {
      const view = viewRef.current;
      if (!view) return;
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: md },
      });
    },
    replaceRange(from: number, to: number, text: string) {
      viewRef.current?.dispatch({ changes: { from, to, insert: text } });
    },
    insertAt(pos: number, text: string) {
      viewRef.current?.dispatch({ changes: { from: pos, insert: text } });
    },
    getSelection() {
      const view = viewRef.current;
      if (!view) return { from: 0, to: 0, text: "" };
      const { from, to } = view.state.selection.main;
      return { from, to, text: view.state.sliceDoc(from, to) };
    },
    replaceSelection(text: string) {
      const view = viewRef.current;
      if (!view) return;
      const { from, to } = view.state.selection.main;
      view.dispatch({ changes: { from, to, insert: text } });
    },
    scrollToPos(pos: number) {
      viewRef.current?.dispatch({
        effects: EditorView.scrollIntoView(pos, { y: "start", yMargin: 80 }),
      });
    },
    focus() {
      viewRef.current?.focus();
    },
    getView() {
      return viewRef.current;
    },
  }));

  useEffect(() => {
    if (!containerRef.current) return;

    const state = EditorState.create({
      doc: initialContent,
      extensions: [
        wnoteTheme,
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        syntaxHighlighting(codeHighlightStyle),
        EditorView.lineWrapping,
        highlightActiveLine(),
        history(),
        markdownKeybindings,
        codeBlockCompletion,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        markdown({ base: markdownLanguage, codeLanguages: languages }),
        markdownPreview,
        tablePreview,
        imagePaste((file) => onImageSaveRef.current?.(file) ?? Promise.resolve(null)),
        slashCommands(),
        cmPlaceholder(placeholder),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            const content = update.state.doc.toString();
            onChangeRef.current?.(content);
          }
          if (update.docChanged || update.selectionSet) {
            const headings = extractHeadings(update.state);
            onHeadingsChangeRef.current?.(headings);
          }
        }),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    const headings = extractHeadings(state);
    onHeadingsChangeRef.current?.(headings);

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []); // eslint-disable-line

  return (
    <div className={styles.container} onContextMenu={handleContextMenu}>
      <div ref={containerRef} className={styles.editorWrap} />
      {contextMenu && viewRef.current && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          view={viewRef.current}
          onClose={handleCloseContextMenu}
        />
      )}
    </div>
  );
}

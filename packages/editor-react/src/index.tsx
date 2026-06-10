import { useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor as TiptapEditor } from "@tiptap/react";
import type { EditorCommandId, HeadingItem } from "@wnote/contracts";
import { BlockHandle } from "./BlockHandle";
import { EditorContentSync, type EditorContentTarget } from "./content-sync";
import { createEditorExtensions } from "./editor-extensions";
import { runEditorCommand } from "./editor-commands";
import styles from "./Editor.module.css";
import { FloatingToolbar } from "./FloatingToolbar";
import { SlashMenu } from "./SlashMenu";
import { TableToolbar } from "./TableToolbar";
import { ImageToolbar } from "./ImageToolbar";
import { writingFocusState } from "./writing-focus-state";

export type { HeadingItem } from "@wnote/contracts";

export interface SavedImageRef {
  src: string;
  previewSrc?: string;
}

export type ImageSaveHandler = (file: File) => Promise<SavedImageRef | null>;
export type AssetResolver = (src: string) => string | null;
export type ImagePathActionHandler = (src: string) => void;

export interface EditorProps {
  initialContent?: string;
  onChange?: (markdown: string) => void;
  onHeadingsChange?: (headings: HeadingItem[]) => void;
  onImageSave?: ImageSaveHandler;
  onImageReveal?: ImagePathActionHandler;
  onImagePathCopy?: ImagePathActionHandler;
  assetResolver?: AssetResolver;
  placeholder?: string;
  ref?: React.Ref<EditorRef>;
}

export interface EditorRef {
  getContent(): string;
  getContentAsync(): Promise<string>;
  setContent(md: string): void;
  replaceRange(from: number, to: number, text: string): void;
  insertAt(pos: number, text: string): void;
  getSelection(): { from: number; to: number; text: string };
  replaceSelection(text: string): void;
  scrollToPos(pos: number): void;
  focus(): void;
  getView(): TiptapEditor | null;
  runCommand(command: EditorCommandId, payload?: unknown): boolean;
}

export function Editor({
  initialContent = "",
  onChange,
  onHeadingsChange,
  onImageSave,
  onImageReveal,
  onImagePathCopy,
  assetResolver,
  placeholder = "开始写作...",
  ref,
}: EditorProps) {
  const contentSyncRef = useRef<EditorContentSync | null>(null);
  contentSyncRef.current ??= new EditorContentSync({
    initialContent,
    loadMarkdown: loadMarkdownModule,
    onChange,
  });
  contentSyncRef.current.setOnChange(onChange);
  const containerRef = useRef<HTMLDivElement>(null);
  const suppressUpdateRef = useRef(false);
  const pendingContentRef = useRef<string | null>(null);
  const onChangeRef = useRef(onChange);
  const onHeadingsChangeRef = useRef(onHeadingsChange);
  const onImageSaveRef = useRef(onImageSave);
  const [editorFocused, setEditorFocused] = useState(false);
  const [gutterActive, setGutterActive] = useState(false);
  onChangeRef.current = onChange;
  onHeadingsChangeRef.current = onHeadingsChange;
  onImageSaveRef.current = onImageSave;

  const extensions = useMemo(
    () =>
      createEditorExtensions({
        assetResolver,
        onImagePathCopy,
        onImageReveal,
        onImageSave,
        placeholder,
      }),
    [assetResolver, onImagePathCopy, onImageReveal, onImageSave, placeholder],
  );

  const editor = useEditor({
    extensions,
    content: "",
    editorProps: {
      attributes: {
        class: styles.editor,
      },
      handlePaste(view, event) {
        const files = getImageFiles(event.clipboardData);
        if (!files.length || !onImageSaveRef.current) return false;
        event.preventDefault();
        void insertSavedImages(editor, files, onImageSaveRef.current);
        return true;
      },
      handleDrop(view, event) {
        const files = getImageFiles(event.dataTransfer);
        if (!files.length || !onImageSaveRef.current) return false;
        event.preventDefault();
        void insertSavedImages(editor, files, onImageSaveRef.current);
        return true;
      },
    },
    onUpdate({ editor }) {
      if (suppressUpdateRef.current) return;
      void contentSyncRef.current?.convertEditorHtml(editor.getHTML());
      onHeadingsChangeRef.current?.(extractHeadings(editor));
    },
    onCreate({ editor }) {
      onHeadingsChangeRef.current?.(extractHeadings(editor));
    },
    onFocus() {
      setEditorFocused(true);
    },
    onBlur() {
      setEditorFocused(false);
    },
  });

  const focusState = writingFocusState({
    editorFocused,
    gutterActive,
    menuOpen: false,
  });

  const applyMarkdownContent = useCallback(async (md: string, target: TiptapEditor) => {
    return (
      contentSyncRef.current?.applyMarkdownContent(
        md,
        tiptapContentTarget(target, suppressUpdateRef),
      ) ?? md
    );
  }, []);

  useEffect(() => {
    if (!editor) return;
    const content =
      pendingContentRef.current ?? contentSyncRef.current?.getContent() ?? initialContent;
    pendingContentRef.current = null;
    void applyMarkdownContent(content, editor);
  }, [applyMarkdownContent, editor]);

  useImperativeHandle(
    ref,
    () => ({
      getContent() {
        return contentSyncRef.current?.getContent() ?? initialContent;
      },
      async getContentAsync() {
        if (!editor) return contentSyncRef.current?.getContentAsync() ?? initialContent;
        return contentSyncRef.current?.getContentAsync(editor.getHTML()) ?? initialContent;
      },
      setContent(md: string) {
        if (!editor) {
          pendingContentRef.current = md;
          void contentSyncRef.current?.applyMarkdownContent(md);
          return;
        }
        void applyMarkdownContent(md, editor);
      },
      replaceRange(from: number, to: number, text: string) {
        if (!editor) return;
        editor
          .chain()
          .focus()
          .setTextSelection({ from: clampPosition(editor, from), to: clampPosition(editor, to) })
          .insertContent(text)
          .run();
      },
      insertAt(pos: number, text: string) {
        if (!editor) return;
        const position = clampPosition(editor, pos);
        editor.chain().focus().setTextSelection(position).insertContent(text).run();
      },
      getSelection() {
        const selection = editor?.state.selection;
        if (!editor || !selection) return { from: 0, to: 0, text: "" };
        return {
          from: selection.from,
          to: selection.to,
          text: editor.state.doc.textBetween(selection.from, selection.to, "\n", "\n"),
        };
      },
      replaceSelection(text: string) {
        editor?.commands.insertContent(text);
      },
      scrollToPos(pos: number) {
        const heading = editor?.view.dom.querySelector<HTMLElement>(`[data-heading-pos="${pos}"]`);
        if (heading) {
          heading.scrollIntoView({ block: "start" });
          return;
        }
        if (!editor) return;
        const position = clampPosition(editor, pos);
        editor.commands.setTextSelection(position);
        const coords = editor.view.coordsAtPos(position);
        const target = document.elementFromPoint(coords.left, coords.top);
        target?.scrollIntoView({ block: "center" });
      },
      focus() {
        editor?.commands.focus();
      },
      getView() {
        return editor;
      },
      runCommand(command, payload) {
        if (!editor) return false;
        return runCommand(editor, command, payload);
      },
    }),
    [applyMarkdownContent, editor, initialContent],
  );

  useEffect(() => {
    if (!editor) return;
    return () => editor.destroy();
  }, [editor]);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      data-writing-focus={focusState.focused ? "true" : "false"}
      data-tools-visible={focusState.toolsVisible ? "true" : "false"}
      onMouseMove={(event) => {
        const editorElement = event.currentTarget.querySelector<HTMLElement>(".ProseMirror");
        const rect = editorElement?.getBoundingClientRect();
        if (!rect) {
          setGutterActive(false);
          return;
        }
        setGutterActive(event.clientX >= rect.left - 76 && event.clientX <= rect.left + 28);
      }}
      onMouseLeave={() => setGutterActive(false)}
    >
      <BlockHandle editor={editor} containerRef={containerRef} />
      <FloatingToolbar editor={editor} containerRef={containerRef} />
      <SlashMenu editor={editor} containerRef={containerRef} />
      <TableToolbar editor={editor} containerRef={containerRef} />
      <ImageToolbar
        editor={editor}
        containerRef={containerRef}
        onImageSave={onImageSave}
        onImageReveal={onImageReveal}
        onImagePathCopy={onImagePathCopy}
      />
      <EditorContent editor={editor} className={styles.wrap} />
    </div>
  );
}

function runCommand(editor: TiptapEditor, command: EditorCommandId, payload?: unknown): boolean {
  return runEditorCommand(editor, command, undefined, payload);
}

export const formatCommands = Object.fromEntries(
  [
    "bold",
    "italic",
    "strikethrough",
    "inlineCode",
    "math",
    "link",
    "image",
    "codeBlock",
    "mermaid",
    "blockquote",
    "unorderedList",
    "orderedList",
    "taskList",
    "horizontalRule",
    "tableInsert",
    "tableAddRowBefore",
    "tableAddRowAfter",
    "tableDeleteRow",
    "tableAddColumnBefore",
    "tableAddColumnAfter",
    "tableDeleteColumn",
    "tableDelete",
    "tableToggleHeaderRow",
    "tableMergeCells",
    "tableSplitCell",
    "heading1",
    "heading2",
    "heading3",
    "heading4",
    "heading5",
    "heading6",
    "headingClear",
  ].map((id) => [id, (editor: TiptapEditor) => runCommand(editor, id as EditorCommandId)]),
) as Record<EditorCommandId, (editor: TiptapEditor) => boolean>;

function extractHeadings(editor: TiptapEditor): HeadingItem[] {
  const headings: HeadingItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name !== "heading") return;
    const text = node.textContent;
    headings.push({
      id: slugify(text),
      level: node.attrs.level,
      text,
      from: pos,
    });
  });
  return headings;
}

function clampPosition(editor: TiptapEditor, pos: number): number {
  return Math.max(0, Math.min(pos, editor.state.doc.content.size));
}

async function insertSavedImages(
  editor: TiptapEditor | null,
  files: File[],
  handler: ImageSaveHandler,
) {
  if (!editor) return;
  for (const file of files) {
    const image = await handler(file);
    if (!image) continue;
    editor
      .chain()
      .focus()
      .insertContent({
        type: "image",
        attrs: {
          src: image.src,
          previewSrc: image.previewSrc,
          alt: file.name,
          title: file.name,
        },
      })
      .run();
  }
}

function getImageFiles(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return [];
  return Array.from(dataTransfer.files).filter((file) => file.type.startsWith("image/"));
}

function slugify(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .replace(/\s+/g, "-") || "heading"
  );
}

function tiptapContentTarget(
  editor: TiptapEditor,
  suppressUpdateRef: React.RefObject<boolean>,
): EditorContentTarget {
  return {
    getHTML() {
      return editor.getHTML();
    },
    setHTML(html: string) {
      try {
        suppressUpdateRef.current = true;
        editor.commands.setContent(html, { emitUpdate: false });
      } finally {
        suppressUpdateRef.current = false;
      }
    },
  };
}

type MarkdownModule = typeof import("@wnote/markdown");

let markdownModulePromise: Promise<MarkdownModule> | null = null;

function loadMarkdownModule(): Promise<MarkdownModule> {
  markdownModulePromise ??= import("@wnote/markdown");
  return markdownModulePromise;
}

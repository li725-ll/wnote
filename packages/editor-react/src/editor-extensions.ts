import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Table } from "@tiptap/extension-table";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import Typography from "@tiptap/extension-typography";
import type { AnyExtension } from "@tiptap/core";
import type { AssetResolver, ImagePathActionHandler, ImageSaveHandler } from "./index";
import { CodeBlock } from "./code-block";
import { Image } from "./image";
import { MarkdownShortcuts } from "./markdown-shortcuts";
import { BlockMath, InlineMath } from "./math";
import { MermaidBlock } from "./mermaid";
import { WriterKeyboardShortcuts } from "./writer-keyboard-shortcuts";

export function createEditorExtensions({
  assetResolver,
  onImagePathCopy,
  onImageReveal,
  onImageSave,
  placeholder,
}: {
  assetResolver?: AssetResolver;
  onImagePathCopy?: ImagePathActionHandler;
  onImageReveal?: ImagePathActionHandler;
  onImageSave?: ImageSaveHandler;
  placeholder: string;
}): AnyExtension[] {
  return [
    StarterKit.configure({
      codeBlock: false,
      link: false,
    }),
    CodeBlock,
    InlineMath,
    BlockMath,
    MermaidBlock,
    MarkdownShortcuts,
    WriterKeyboardShortcuts,
    Link.configure({
      openOnClick: false,
      autolink: true,
      defaultProtocol: "https",
    }),
    Image.configure({
      allowBase64: true,
      assetResolver,
      onImagePathCopy,
      onImageReveal,
      onImageSave,
    }),
    Placeholder.configure({ placeholder }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    TaskList,
    TaskItem.configure({ nested: true }),
    Typography,
  ];
}

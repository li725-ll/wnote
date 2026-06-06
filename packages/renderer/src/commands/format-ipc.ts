import { IpcChannel } from "@wnote/contracts";
import { editorFormatCommands, type EditorFormatCommand } from "./editor-format-commands";

export const formatIpcCommandEntries: readonly [IpcChannel, EditorFormatCommand][] = [
  [IpcChannel.FormatBold, editorFormatCommands.bold],
  [IpcChannel.FormatItalic, editorFormatCommands.italic],
  [IpcChannel.FormatStrikethrough, editorFormatCommands.strikethrough],
  [IpcChannel.FormatInlineCode, editorFormatCommands.inlineCode],
  [IpcChannel.FormatMath, editorFormatCommands.math],
  [IpcChannel.FormatLink, editorFormatCommands.link],
  [IpcChannel.FormatImage, editorFormatCommands.image],
  [IpcChannel.FormatCodeBlock, editorFormatCommands.codeBlock],
  [IpcChannel.FormatBlockquote, editorFormatCommands.blockquote],
  [IpcChannel.FormatUnorderedList, editorFormatCommands.unorderedList],
  [IpcChannel.FormatOrderedList, editorFormatCommands.orderedList],
  [IpcChannel.FormatTaskList, editorFormatCommands.taskList],
  [IpcChannel.FormatHorizontalRule, editorFormatCommands.horizontalRule],
  [IpcChannel.FormatHeading1, editorFormatCommands.heading1],
  [IpcChannel.FormatHeading2, editorFormatCommands.heading2],
  [IpcChannel.FormatHeading3, editorFormatCommands.heading3],
  [IpcChannel.FormatHeading4, editorFormatCommands.heading4],
  [IpcChannel.FormatHeading5, editorFormatCommands.heading5],
  [IpcChannel.FormatHeading6, editorFormatCommands.heading6],
  [IpcChannel.FormatHeadingClear, editorFormatCommands.headingClear],
];

import { formatCommands } from "@wnote/editor-react";
import { IpcChannel } from "@wnote/contracts";
import type { EditorFormatCommand } from "./palette-commands";

export const formatIpcCommandEntries: readonly [IpcChannel, EditorFormatCommand][] = [
  [IpcChannel.FormatBold, formatCommands.bold],
  [IpcChannel.FormatItalic, formatCommands.italic],
  [IpcChannel.FormatStrikethrough, formatCommands.strikethrough],
  [IpcChannel.FormatInlineCode, formatCommands.inlineCode],
  [IpcChannel.FormatMath, formatCommands.math],
  [IpcChannel.FormatLink, formatCommands.link],
  [IpcChannel.FormatImage, formatCommands.image],
  [IpcChannel.FormatCodeBlock, formatCommands.codeBlock],
  [IpcChannel.FormatBlockquote, formatCommands.blockquote],
  [IpcChannel.FormatUnorderedList, formatCommands.unorderedList],
  [IpcChannel.FormatOrderedList, formatCommands.orderedList],
  [IpcChannel.FormatTaskList, formatCommands.taskList],
  [IpcChannel.FormatHorizontalRule, formatCommands.horizontalRule],
  [IpcChannel.FormatHeading1, formatCommands.heading1],
  [IpcChannel.FormatHeading2, formatCommands.heading2],
  [IpcChannel.FormatHeading3, formatCommands.heading3],
  [IpcChannel.FormatHeading4, formatCommands.heading4],
  [IpcChannel.FormatHeading5, formatCommands.heading5],
  [IpcChannel.FormatHeading6, formatCommands.heading6],
  [IpcChannel.FormatHeadingClear, formatCommands.headingClear],
];

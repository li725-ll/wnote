import { useEffect } from "react";
import type { EditorRef } from "@wnote/editor-react";
import { formatIpcCommandEntries } from "../commands/format-ipc";

export function useFormatIpc(getEditorView: () => ReturnType<EditorRef["getView"]>) {
  useEffect(() => {
    const handlers = formatIpcCommandEntries.map(([channel, command]) => {
      const handler = () => {
        const view = getEditorView();
        if (view) command(view);
      };
      window.electronAPI.on(channel, handler);
      return [channel, handler] as const;
    });
    return () => {
      for (const [channel, handler] of handlers) {
        window.electronAPI.off(channel, handler);
      }
    };
  }, [getEditorView]);
}

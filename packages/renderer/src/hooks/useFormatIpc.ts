import { useEffect } from "react";
import type { EditorRef } from "@wnote/editor-react";
import { formatIpcCommandEntries } from "../commands/format-ipc";

export function useFormatIpc(getEditorView: () => ReturnType<EditorRef["getView"]>) {
  useEffect(() => {
    const unsubscribers = formatIpcCommandEntries.map(([channel, command]) => {
      const handler = () => {
        const view = getEditorView();
        if (view) command(view);
      };
      return window.electronAPI.on(channel, handler);
    });
    return () => {
      for (const unsubscribe of unsubscribers) unsubscribe();
    };
  }, [getEditorView]);
}

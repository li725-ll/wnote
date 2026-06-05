import { useCallback } from "react";
import { IpcChannel } from "@wnote/contracts";

export function useWindowTitle() {
  return useCallback((title: string) => {
    window.electronAPI.send(IpcChannel.WindowTitleSet, title);
  }, []);
}

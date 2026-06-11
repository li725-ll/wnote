import { useEffect } from "react";
import { IpcChannel } from "@wnote/contracts";

export function useNavigationIpc(onNavigate: (page: string) => void) {
  useEffect(() => {
    const handler = (...args: unknown[]) => {
      onNavigate(args[0] as string);
    };
    return window.electronAPI.on(IpcChannel.Navigate, handler);
  }, [onNavigate]);
}

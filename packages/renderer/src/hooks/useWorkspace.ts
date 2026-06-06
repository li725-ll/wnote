import { useCallback, useEffect, useState } from "react";
import { IpcChannel, type OpenDocumentResult, type WorkspaceOpenResult } from "@wnote/contracts";

export function useWorkspace({
  onDocumentOpen,
}: {
  onDocumentOpen(data: OpenDocumentResult): void;
}) {
  const [workspace, setWorkspace] = useState<WorkspaceOpenResult | null>(null);
  const [loading, setLoading] = useState(false);

  const readWorkspace = useCallback(async () => {
    const result = await window.electronAPI.invoke<WorkspaceOpenResult | null>(
      IpcChannel.WorkspaceRead,
    );
    setWorkspace(result);
  }, []);

  useEffect(() => {
    void readWorkspace();
  }, [readWorkspace]);

  const openWorkspace = useCallback(async () => {
    setLoading(true);
    try {
      const result = await window.electronAPI.invoke<WorkspaceOpenResult | null>(
        IpcChannel.WorkspaceOpen,
      );
      if (result) setWorkspace(result);
    } finally {
      setLoading(false);
    }
  }, []);

  const openWorkspaceFile = useCallback(
    async (filePath: string) => {
      const result = await window.electronAPI.invoke<OpenDocumentResult | null>(
        IpcChannel.WorkspaceFileOpen,
        filePath,
      );
      if (result) onDocumentOpen(result);
    },
    [onDocumentOpen],
  );

  return {
    workspace,
    loading,
    openWorkspace,
    openWorkspaceFile,
  };
}

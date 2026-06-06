import { useCallback, useEffect, useState } from "react";
import {
  IpcChannel,
  type OpenDocumentResult,
  type WorkspaceCreateFileResult,
  type WorkspaceOpenResult,
} from "@wnote/contracts";

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

  const createWorkspaceFile = useCallback(
    async (name: string, parentPath?: string) => {
      if (!workspace) return;
      const result = await window.electronAPI.invoke<WorkspaceCreateFileResult | null>(
        IpcChannel.WorkspaceCreateFile,
        {
          rootPath: workspace.rootPath,
          parentPath,
          name,
        },
      );
      if (!result) return;
      setWorkspace(result.workspace);
      onDocumentOpen(result.document);
    },
    [onDocumentOpen, workspace],
  );

  const createWorkspaceDirectory = useCallback(
    async (name: string, parentPath?: string) => {
      if (!workspace) return;
      const result = await window.electronAPI.invoke<WorkspaceOpenResult | null>(
        IpcChannel.WorkspaceCreateDirectory,
        {
          rootPath: workspace.rootPath,
          parentPath,
          name,
        },
      );
      if (result) setWorkspace(result);
    },
    [workspace],
  );

  return {
    workspace,
    loading,
    openWorkspace,
    openWorkspaceFile,
    createWorkspaceFile,
    createWorkspaceDirectory,
  };
}

import { useCallback, useEffect, useState } from "react";
import {
  IpcChannel,
  type OpenDocumentResult,
  type WorkspaceCreateFileResult,
  type WorkspaceDeleteResult,
  type WorkspaceOpenResult,
  type WorkspaceRenameResult,
} from "@wnote/contracts";

export function useWorkspace({
  onDocumentOpen,
  onDeletePath,
  onRenamePath,
}: {
  onDocumentOpen(data: OpenDocumentResult): void;
  onDeletePath?(path: string): void;
  onRenamePath?(oldPath: string, newPath: string): void;
}) {
  const [workspace, setWorkspace] = useState<WorkspaceOpenResult | null>(null);
  const [loading, setLoading] = useState(false);

  const readWorkspace = useCallback(async () => {
    const result = await window.electronAPI.invoke<WorkspaceOpenResult | null>(
      IpcChannel.WorkspaceRead,
    );
    setWorkspace(result);
  }, []);

  const refreshWorkspace = useCallback(async () => {
    if (!workspace) {
      await readWorkspace();
      return;
    }
    setLoading(true);
    try {
      const result = await window.electronAPI.invoke<WorkspaceOpenResult | null>(
        IpcChannel.WorkspaceRead,
        { rootPath: workspace.rootPath },
      );
      if (result) setWorkspace(result);
    } finally {
      setLoading(false);
    }
  }, [readWorkspace, workspace]);

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

  const renameWorkspaceEntry = useCallback(
    async (targetPath: string, name: string) => {
      if (!workspace) return;
      const result = await window.electronAPI.invoke<WorkspaceRenameResult | null>(
        IpcChannel.WorkspaceRename,
        {
          rootPath: workspace.rootPath,
          targetPath,
          name,
        },
      );
      if (!result) return;
      setWorkspace(result.workspace);
      if (result.nodeType === "file") onRenamePath?.(result.oldPath, result.newPath);
    },
    [onRenamePath, workspace],
  );

  const deleteWorkspaceEntry = useCallback(
    async (targetPath: string) => {
      if (!workspace) return;
      const result = await window.electronAPI.invoke<WorkspaceDeleteResult | null>(
        IpcChannel.WorkspaceDelete,
        {
          rootPath: workspace.rootPath,
          targetPath,
        },
      );
      if (!result) return;
      setWorkspace(result.workspace);
      if (result.nodeType === "file") onDeletePath?.(result.deletedPath);
    },
    [onDeletePath, workspace],
  );

  return {
    workspace,
    loading,
    openWorkspace,
    refreshWorkspace,
    openWorkspaceFile,
    createWorkspaceFile,
    createWorkspaceDirectory,
    renameWorkspaceEntry,
    deleteWorkspaceEntry,
  };
}

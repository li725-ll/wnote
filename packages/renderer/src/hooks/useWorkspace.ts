import { useCallback, useEffect, useState } from "react";
import {
  IpcChannel,
  type OpenDocumentResult,
  type WorkspaceCreateFileResult,
  type WorkspaceDeleteResult,
  type WorkspaceMoveResult,
  type WorkspaceOpenResult,
  type WorkspaceRenameResult,
  type WorkspaceTreeNode,
} from "@wnote/contracts";

export function useWorkspace({
  onDocumentOpen,
  onDeletePath,
  onMovePath,
  onRenamePath,
  onError,
}: {
  onDocumentOpen(data: OpenDocumentResult): void;
  onDeletePath?(path: string, nodeType: WorkspaceTreeNode["type"]): void;
  onMovePath?(oldPath: string, newPath: string, nodeType: WorkspaceTreeNode["type"]): void;
  onRenamePath?(oldPath: string, newPath: string, nodeType: WorkspaceTreeNode["type"]): void;
  onError?(message: string): void;
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

  const openWorkspacePath = useCallback(async (rootPath: string) => {
    setLoading(true);
    try {
      const result = await window.electronAPI.invoke<WorkspaceOpenResult | null>(
        IpcChannel.WorkspaceOpen,
        { rootPath },
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
      try {
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
      } catch (error) {
        onError?.(workspaceErrorMessage(error));
      }
    },
    [onDocumentOpen, onError, workspace],
  );

  const createWorkspaceDirectory = useCallback(
    async (name: string, parentPath?: string) => {
      if (!workspace) return;
      try {
        const result = await window.electronAPI.invoke<WorkspaceOpenResult | null>(
          IpcChannel.WorkspaceCreateDirectory,
          {
            rootPath: workspace.rootPath,
            parentPath,
            name,
          },
        );
        if (result) setWorkspace(result);
      } catch (error) {
        onError?.(workspaceErrorMessage(error));
      }
    },
    [onError, workspace],
  );

  const renameWorkspaceEntry = useCallback(
    async (targetPath: string, name: string) => {
      if (!workspace) return;
      try {
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
        onRenamePath?.(result.oldPath, result.newPath, result.nodeType);
      } catch (error) {
        onError?.(workspaceErrorMessage(error));
      }
    },
    [onError, onRenamePath, workspace],
  );

  const moveWorkspaceEntry = useCallback(
    async (sourcePath: string, targetDirectoryPath?: string) => {
      if (!workspace) return;
      try {
        const result = await window.electronAPI.invoke<WorkspaceMoveResult | null>(
          IpcChannel.WorkspaceMove,
          {
            rootPath: workspace.rootPath,
            sourcePath,
            targetDirectoryPath,
          },
        );
        if (!result) return;
        setWorkspace(result.workspace);
        onMovePath?.(result.oldPath, result.newPath, result.nodeType);
      } catch (error) {
        onError?.(workspaceErrorMessage(error));
      }
    },
    [onError, onMovePath, workspace],
  );

  const deleteWorkspaceEntry = useCallback(
    async (targetPath: string, recursive?: boolean) => {
      if (!workspace) return;
      try {
        const result = await window.electronAPI.invoke<WorkspaceDeleteResult | null>(
          IpcChannel.WorkspaceDelete,
          {
            rootPath: workspace.rootPath,
            targetPath,
            recursive,
          },
        );
        if (!result) return;
        setWorkspace(result.workspace);
        onDeletePath?.(result.deletedPath, result.nodeType);
      } catch (error) {
        onError?.(workspaceErrorMessage(error));
      }
    },
    [onDeletePath, onError, workspace],
  );

  return {
    workspace,
    loading,
    openWorkspace,
    openWorkspacePath,
    refreshWorkspace,
    openWorkspaceFile,
    createWorkspaceFile,
    createWorkspaceDirectory,
    renameWorkspaceEntry,
    moveWorkspaceEntry,
    deleteWorkspaceEntry,
  };
}

function workspaceErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "工作区操作失败。";
  if (error.message.includes("already exists")) return "同名文件或文件夹已存在。";
  if (error.message.includes("Unsupported workspace document extension")) {
    return "仅支持 .md、.markdown 和 .txt 文档。";
  }
  if (error.message.includes("not empty")) return "文件夹不是空的，暂不能删除。";
  if (error.message.includes("outside the workspace")) return "目标路径不在当前工作区内。";
  if (error.message.includes("cannot be moved into itself")) return "不能将文件夹移动到自身内部。";
  if (error.message.includes("permission") || error.message.includes("EACCES")) {
    return "没有权限完成该操作。";
  }
  return error.message || "工作区操作失败。";
}

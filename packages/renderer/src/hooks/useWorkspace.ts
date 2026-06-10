import { useCallback, useEffect } from "react";
import type { OpenDocumentResult, WorkspaceTreeNode } from "@wnote/contracts";
import { useWorkspaceStore } from "../stores/workspace-store";

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
  const workspace = useWorkspaceStore((state) => state.workspace);
  const loading = useWorkspaceStore((state) => state.loading);
  const readWorkspace = useWorkspaceStore((state) => state.readWorkspace);
  const refreshWorkspaceAction = useWorkspaceStore((state) => state.refreshWorkspace);
  const openWorkspaceAction = useWorkspaceStore((state) => state.openWorkspace);
  const openWorkspacePathAction = useWorkspaceStore((state) => state.openWorkspacePath);
  const openWorkspaceFileAction = useWorkspaceStore((state) => state.openWorkspaceFile);
  const createWorkspaceFileAction = useWorkspaceStore((state) => state.createWorkspaceFile);
  const createWorkspaceDirectoryAction = useWorkspaceStore(
    (state) => state.createWorkspaceDirectory,
  );
  const renameWorkspaceEntryAction = useWorkspaceStore((state) => state.renameWorkspaceEntry);
  const moveWorkspaceEntryAction = useWorkspaceStore((state) => state.moveWorkspaceEntry);
  const deleteWorkspaceEntryAction = useWorkspaceStore((state) => state.deleteWorkspaceEntry);

  useEffect(() => {
    void readWorkspace();
  }, [readWorkspace]);

  const refreshWorkspace = useCallback(async () => {
    await refreshWorkspaceAction();
  }, [refreshWorkspaceAction]);

  const openWorkspace = useCallback(async () => {
    await openWorkspaceAction();
  }, [openWorkspaceAction]);

  const openWorkspacePath = useCallback(
    async (rootPath: string) => {
      await openWorkspacePathAction(rootPath);
    },
    [openWorkspacePathAction],
  );

  const openWorkspaceFile = useCallback(
    async (filePath: string) => {
      const result = await openWorkspaceFileAction(filePath);
      if (result) onDocumentOpen(result);
    },
    [onDocumentOpen, openWorkspaceFileAction],
  );

  const createWorkspaceFile = useCallback(
    async (name: string, parentPath?: string) => {
      try {
        const result = await createWorkspaceFileAction(name, parentPath);
        if (result) onDocumentOpen(result.document);
      } catch (error) {
        onError?.(workspaceErrorMessage(error));
      }
    },
    [createWorkspaceFileAction, onDocumentOpen, onError],
  );

  const createWorkspaceDirectory = useCallback(
    async (name: string, parentPath?: string) => {
      try {
        await createWorkspaceDirectoryAction(name, parentPath);
      } catch (error) {
        onError?.(workspaceErrorMessage(error));
      }
    },
    [createWorkspaceDirectoryAction, onError],
  );

  const renameWorkspaceEntry = useCallback(
    async (targetPath: string, name: string) => {
      try {
        const result = await renameWorkspaceEntryAction(targetPath, name);
        if (result) onRenamePath?.(result.oldPath, result.newPath, result.nodeType);
      } catch (error) {
        onError?.(workspaceErrorMessage(error));
      }
    },
    [onError, onRenamePath, renameWorkspaceEntryAction],
  );

  const moveWorkspaceEntry = useCallback(
    async (sourcePath: string, targetDirectoryPath?: string) => {
      try {
        const result = await moveWorkspaceEntryAction(sourcePath, targetDirectoryPath);
        if (result) onMovePath?.(result.oldPath, result.newPath, result.nodeType);
      } catch (error) {
        onError?.(workspaceErrorMessage(error));
      }
    },
    [moveWorkspaceEntryAction, onError, onMovePath],
  );

  const deleteWorkspaceEntry = useCallback(
    async (targetPath: string, recursive?: boolean) => {
      try {
        const result = await deleteWorkspaceEntryAction(targetPath, recursive);
        if (result) onDeletePath?.(result.deletedPath, result.nodeType);
      } catch (error) {
        onError?.(workspaceErrorMessage(error));
      }
    },
    [deleteWorkspaceEntryAction, onDeletePath, onError],
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

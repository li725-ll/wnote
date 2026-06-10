import { create } from "zustand";
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

interface WorkspaceStore {
  workspace: WorkspaceOpenResult | null;
  loading: boolean;
  setWorkspace: (workspace: WorkspaceOpenResult | null) => void;
  readWorkspace: () => Promise<WorkspaceOpenResult | null>;
  refreshWorkspace: () => Promise<WorkspaceOpenResult | null>;
  openWorkspace: () => Promise<WorkspaceOpenResult | null>;
  openWorkspacePath: (rootPath: string) => Promise<WorkspaceOpenResult | null>;
  openWorkspaceFile: (filePath: string) => Promise<OpenDocumentResult | null>;
  createWorkspaceFile: (
    name: string,
    parentPath?: string,
  ) => Promise<WorkspaceCreateFileResult | null>;
  createWorkspaceDirectory: (
    name: string,
    parentPath?: string,
  ) => Promise<WorkspaceOpenResult | null>;
  renameWorkspaceEntry: (targetPath: string, name: string) => Promise<WorkspaceRenameResult | null>;
  moveWorkspaceEntry: (
    sourcePath: string,
    targetDirectoryPath?: string,
  ) => Promise<WorkspaceMoveResult | null>;
  deleteWorkspaceEntry: (
    targetPath: string,
    recursive?: boolean,
  ) => Promise<WorkspaceDeleteResult | null>;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspace: null,
  loading: false,
  setWorkspace: (workspace) => set({ workspace }),
  readWorkspace: async () => {
    const result = await window.electronAPI.invoke<WorkspaceOpenResult | null>(
      IpcChannel.WorkspaceRead,
    );
    set({ workspace: result });
    return result;
  },
  refreshWorkspace: async () => {
    const { workspace, readWorkspace } = get();
    if (!workspace) return readWorkspace();
    set({ loading: true });
    try {
      const result = await window.electronAPI.invoke<WorkspaceOpenResult | null>(
        IpcChannel.WorkspaceRead,
        { rootPath: workspace.rootPath },
      );
      if (result) set({ workspace: result });
      return result;
    } finally {
      set({ loading: false });
    }
  },
  openWorkspace: async () => {
    set({ loading: true });
    try {
      const result = await window.electronAPI.invoke<WorkspaceOpenResult | null>(
        IpcChannel.WorkspaceOpen,
      );
      if (result) set({ workspace: result });
      return result;
    } finally {
      set({ loading: false });
    }
  },
  openWorkspacePath: async (rootPath) => {
    set({ loading: true });
    try {
      const result = await window.electronAPI.invoke<WorkspaceOpenResult | null>(
        IpcChannel.WorkspaceOpen,
        { rootPath },
      );
      if (result) set({ workspace: result });
      return result;
    } finally {
      set({ loading: false });
    }
  },
  openWorkspaceFile: async (filePath) => {
    return window.electronAPI.invoke<OpenDocumentResult | null>(
      IpcChannel.WorkspaceFileOpen,
      filePath,
    );
  },
  createWorkspaceFile: async (name, parentPath) => {
    const workspace = get().workspace;
    if (!workspace) return null;
    const result = await window.electronAPI.invoke<WorkspaceCreateFileResult | null>(
      IpcChannel.WorkspaceCreateFile,
      {
        rootPath: workspace.rootPath,
        parentPath,
        name,
      },
    );
    if (result) set({ workspace: result.workspace });
    return result;
  },
  createWorkspaceDirectory: async (name, parentPath) => {
    const workspace = get().workspace;
    if (!workspace) return null;
    const result = await window.electronAPI.invoke<WorkspaceOpenResult | null>(
      IpcChannel.WorkspaceCreateDirectory,
      {
        rootPath: workspace.rootPath,
        parentPath,
        name,
      },
    );
    if (result) set({ workspace: result });
    return result;
  },
  renameWorkspaceEntry: async (targetPath, name) => {
    const workspace = get().workspace;
    if (!workspace) return null;
    const result = await window.electronAPI.invoke<WorkspaceRenameResult | null>(
      IpcChannel.WorkspaceRename,
      {
        rootPath: workspace.rootPath,
        targetPath,
        name,
      },
    );
    if (result) set({ workspace: result.workspace });
    return result;
  },
  moveWorkspaceEntry: async (sourcePath, targetDirectoryPath) => {
    const workspace = get().workspace;
    if (!workspace) return null;
    const result = await window.electronAPI.invoke<WorkspaceMoveResult | null>(
      IpcChannel.WorkspaceMove,
      {
        rootPath: workspace.rootPath,
        sourcePath,
        targetDirectoryPath,
      },
    );
    if (result) set({ workspace: result.workspace });
    return result;
  },
  deleteWorkspaceEntry: async (targetPath, recursive) => {
    const workspace = get().workspace;
    if (!workspace) return null;
    const result = await window.electronAPI.invoke<WorkspaceDeleteResult | null>(
      IpcChannel.WorkspaceDelete,
      {
        rootPath: workspace.rootPath,
        targetPath,
        recursive,
      },
    );
    if (result) set({ workspace: result.workspace });
    return result;
  },
}));

export type WorkspacePathChange = {
  oldPath: string;
  newPath: string;
  nodeType: WorkspaceTreeNode["type"];
};

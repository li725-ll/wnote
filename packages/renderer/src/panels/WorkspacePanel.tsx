import { useMemo, useState } from "react";
import type { WorkspaceTreeNode } from "@wnote/contracts";
import {
  filterWorkspaceTree,
  flattenWorkspaceTree,
  hasWorkspaceEntries,
} from "./workspace-panel-state";
import styles from "./WorkspacePanel.module.css";

type CreateMode = "file" | "directory";
type RenameTarget = { path: string; name: string };
type CreateTarget = { parentPath?: string; label: string };
type MoveTarget = { path: string; name: string };
const collapsedStorageKey = "wnote.workspace.collapsed";

interface WorkspacePanelProps {
  name?: string;
  tree: WorkspaceTreeNode[];
  activePath?: string | null;
  loading?: boolean;
  onOpenWorkspace: () => void;
  onOpenFile: (filePath: string) => void;
  onCreateFile?: (name: string, parentPath?: string) => void;
  onCreateDirectory?: (name: string, parentPath?: string) => void;
  onRefresh?: () => void;
  onRename?: (path: string, name: string) => void;
  onMove?: (sourcePath: string, targetDirectoryPath?: string) => void;
  onDelete?: (path: string, recursive?: boolean) => void;
}

export function WorkspacePanel({
  name,
  tree,
  activePath,
  loading,
  onOpenWorkspace,
  onOpenFile,
  onCreateFile,
  onCreateDirectory,
  onRefresh,
  onRename,
  onMove,
  onDelete,
}: WorkspacePanelProps) {
  const hasEntries = hasWorkspaceEntries(tree);
  const canCreate = Boolean(name);
  const [createMode, setCreateMode] = useState<CreateMode | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateTarget>({ label: "工作区" });
  const [draftName, setDraftName] = useState("");
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [moveDestination, setMoveDestination] = useState("");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [collapsedPaths, setCollapsedPaths] = useState<Set<string>>(() => readCollapsedPaths());
  const visibleTree = useMemo(() => filterWorkspaceTree(tree, query), [query, tree]);
  const directories = useMemo(
    () => flattenWorkspaceTree(tree).filter((node) => node.type === "directory"),
    [tree],
  );

  const selectedNode = selectedPath
    ? flattenWorkspaceTree(tree).find((node) => node.path === selectedPath)
    : null;
  const selectedCreateTarget =
    selectedNode?.type === "directory"
      ? { parentPath: selectedNode.path, label: selectedNode.name }
      : selectedNode?.type === "file"
        ? parentCreateTarget(tree, selectedNode.path)
        : { label: "工作区" };

  const startCreate = (mode: CreateMode, target: CreateTarget = selectedCreateTarget) => {
    setRenameTarget(null);
    setMoveTarget(null);
    setCreateMode(mode);
    setCreateTarget(target);
    setDraftName(mode === "file" ? "untitled.md" : "notes");
  };

  const cancelCreate = () => {
    setCreateMode(null);
    setDraftName("");
  };

  const submitCreate = () => {
    const nextName = draftName.trim();
    if (!nextName || !createMode) return;
    if (createMode === "file") onCreateFile?.(nextName, createTarget.parentPath);
    if (createMode === "directory") onCreateDirectory?.(nextName, createTarget.parentPath);
    cancelCreate();
  };

  const submitRename = () => {
    const nextName = draftName.trim();
    if (!nextName || !renameTarget) return;
    onRename?.(renameTarget.path, nextName);
    cancelCreate();
    setRenameTarget(null);
  };

  const cancelRename = () => {
    setRenameTarget(null);
    setDraftName("");
  };

  const startRename = (node: WorkspaceTreeNode) => {
    setCreateMode(null);
    setMoveTarget(null);
    setRenameTarget({ path: node.path, name: node.name });
    setDraftName(node.name);
    setSelectedPath(node.path);
  };

  const submitDelete = (node: WorkspaceTreeNode) => {
    const recursive = node.type === "directory" && (node.children?.length ?? 0) > 0;
    const message = recursive
      ? `删除文件夹 ${node.name} 及其中所有文件？此操作不可撤销。`
      : `删除 ${node.name}？`;
    if (!window.confirm(message)) return;
    onDelete?.(node.path, recursive);
    setSelectedPath(null);
  };

  const startMove = (node: WorkspaceTreeNode) => {
    setCreateMode(null);
    setRenameTarget(null);
    setMoveTarget({ path: node.path, name: node.name });
    setMoveDestination("");
    setSelectedPath(node.path);
  };

  const submitMove = () => {
    if (!moveTarget) return;
    onMove?.(moveTarget.path, moveDestination || undefined);
    setMoveTarget(null);
    setMoveDestination("");
  };

  const setDirectoryCollapsed = (path: string, collapsed: boolean) => {
    setCollapsedPaths((current) => {
      const next = new Set(current);
      if (collapsed) next.add(path);
      else next.delete(path);
      writeCollapsedPaths(next);
      return next;
    });
  };

  return (
    <section
      className={styles.root}
      aria-label="工作区文件"
      onDragOver={(event) => {
        if (!onMove) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        const sourcePath = event.dataTransfer.getData("application/x-wnote-workspace-path");
        if (!sourcePath || !onMove) return;
        event.preventDefault();
        onMove(sourcePath);
      }}
      onKeyDown={(event) => {
        if (event.defaultPrevented || event.target instanceof HTMLInputElement) return;
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
          event.preventDefault();
          startCreate("file");
        }
        if ((event.metaKey || event.ctrlKey) && event.shiftKey && event.key.toLowerCase() === "n") {
          event.preventDefault();
          startCreate("directory");
        }
        if (event.key === "F2" && selectedNode) {
          event.preventDefault();
          startRename(selectedNode);
        }
        if ((event.key === "Delete" || event.key === "Backspace") && selectedNode) {
          event.preventDefault();
          submitDelete(selectedNode);
        }
      }}
    >
      <div className={styles.header}>
        <span className={styles.heading}>{name ?? "工作区"}</span>
        <div className={styles.actions}>
          {canCreate ? (
            <>
              <button
                className={styles.actionButton}
                type="button"
                aria-label="+ 文件"
                title="新建文件"
                onClick={() => startCreate("file")}
              >
                +
              </button>
              <button
                className={styles.actionButton}
                type="button"
                aria-label="+ 文件夹"
                title="新建文件夹"
                onClick={() => startCreate("directory")}
              >
                ⊕
              </button>
              <button
                className={styles.actionButton}
                type="button"
                aria-label="刷新"
                title="刷新"
                onClick={onRefresh}
              >
                ↻
              </button>
            </>
          ) : null}
          <button className={styles.openButton} type="button" onClick={onOpenWorkspace}>
            {name ? "切换" : "打开"}
          </button>
        </div>
      </div>
      {canCreate ? (
        <div className={styles.searchRow}>
          <input
            aria-label="搜索工作区"
            value={query}
            placeholder="搜索"
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      ) : null}
      {createMode || renameTarget ? (
        <div className={styles.createForm}>
          {createMode ? <span className={styles.createTarget}>{createTarget.label}</span> : null}
          <input
            aria-label={renameTarget ? "重命名" : createMode === "file" ? "文件名" : "文件夹名"}
            value={draftName}
            autoFocus
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                if (renameTarget) submitRename();
                else submitCreate();
              }
              if (event.key === "Escape") {
                if (renameTarget) cancelRename();
                else cancelCreate();
              }
            }}
          />
          <button type="button" onClick={renameTarget ? submitRename : submitCreate}>
            {renameTarget ? "保存" : "创建"}
          </button>
          <button type="button" onClick={renameTarget ? cancelRename : cancelCreate}>
            取消
          </button>
        </div>
      ) : null}
      {moveTarget ? (
        <div className={styles.createForm}>
          <span className={styles.createTarget}>移动</span>
          <select
            aria-label="移动到"
            value={moveDestination}
            onChange={(event) => setMoveDestination(event.target.value)}
          >
            <option value="">工作区</option>
            {directories
              .filter((directory) => !pathInDirectory(directory.path, moveTarget.path))
              .map((directory) => (
                <option key={directory.path} value={directory.path}>
                  {directory.name}
                </option>
              ))}
          </select>
          <button type="button" aria-label="确认移动" onClick={submitMove}>
            移动
          </button>
          <button type="button" onClick={() => setMoveTarget(null)}>
            取消
          </button>
        </div>
      ) : null}
      {loading ? <p className={styles.empty}>正在读取...</p> : null}
      {!loading && !hasEntries ? (
        <div className={styles.emptyState}>
          <p>打开目录以浏览文档。</p>
          <button type="button" onClick={onOpenWorkspace}>
            打开目录
          </button>
        </div>
      ) : (
        <ul className={styles.tree}>
          {visibleTree.map((node) => (
            <WorkspaceNode
              key={node.path}
              node={node}
              depth={0}
              activePath={activePath}
              selectedPath={selectedPath}
              collapsedPaths={collapsedPaths}
              forceOpen={Boolean(query.trim())}
              onOpenFile={onOpenFile}
              onRename={startRename}
              onMove={startMove}
              onDelete={submitDelete}
              onCreate={startCreate}
              onSelect={setSelectedPath}
              onDropMove={(sourcePath, targetDirectoryPath) =>
                onMove?.(sourcePath, targetDirectoryPath)
              }
              onDirectoryCollapsed={setDirectoryCollapsed}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function WorkspaceNode({
  node,
  depth,
  activePath,
  selectedPath,
  collapsedPaths,
  forceOpen,
  onOpenFile,
  onRename,
  onMove,
  onDelete,
  onCreate,
  onSelect,
  onDropMove,
  onDirectoryCollapsed,
}: {
  node: WorkspaceTreeNode;
  depth: number;
  activePath?: string | null;
  selectedPath?: string | null;
  collapsedPaths: Set<string>;
  forceOpen: boolean;
  onOpenFile: (filePath: string) => void;
  onRename: (node: WorkspaceTreeNode) => void;
  onMove: (node: WorkspaceTreeNode) => void;
  onDelete: (node: WorkspaceTreeNode) => void;
  onCreate: (mode: CreateMode, target?: CreateTarget) => void;
  onSelect: (path: string) => void;
  onDropMove: (sourcePath: string, targetDirectoryPath?: string) => void;
  onDirectoryCollapsed: (path: string, collapsed: boolean) => void;
}) {
  if (node.type === "directory") {
    const target = { parentPath: node.path, label: node.name };
    const open = forceOpen || !collapsedPaths.has(node.path);
    return (
      <li>
        <details
          open={open}
          onToggle={(event) => onDirectoryCollapsed(node.path, !event.currentTarget.open)}
        >
          <summary
            className={styles.directory}
            data-active={node.path === selectedPath ? "true" : "false"}
            draggable
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={() => onSelect(node.path)}
            onDragStart={(event) => {
              event.dataTransfer.setData("application/x-wnote-workspace-path", node.path);
              event.dataTransfer.effectAllowed = "move";
            }}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              const sourcePath = event.dataTransfer.getData("application/x-wnote-workspace-path");
              if (!sourcePath || sourcePath === node.path) return;
              event.preventDefault();
              event.stopPropagation();
              onDropMove(sourcePath, node.path);
            }}
          >
            <span className={styles.icon}>▸</span>
            <span className={styles.name}>{node.name}</span>
            <span className={styles.nodeActions}>
              <button
                type="button"
                title="在此新建文件"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCreate("file", target);
                }}
              >
                +文件
              </button>
              <button
                type="button"
                title="在此新建文件夹"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onCreate("directory", target);
                }}
              >
                +文件夹
              </button>
              <button
                type="button"
                title="移动到..."
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onMove(node);
                }}
              >
                移动
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onRename(node);
                }}
              >
                改名
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onDelete(node);
                }}
              >
                删除
              </button>
            </span>
          </summary>
          <ul className={styles.children}>
            {(node.children ?? []).map((child) => (
              <WorkspaceNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                selectedPath={selectedPath}
                collapsedPaths={collapsedPaths}
                forceOpen={forceOpen}
                onOpenFile={onOpenFile}
                onRename={onRename}
                onMove={onMove}
                onDelete={onDelete}
                onCreate={onCreate}
                onSelect={onSelect}
                onDropMove={onDropMove}
                onDirectoryCollapsed={onDirectoryCollapsed}
              />
            ))}
          </ul>
        </details>
      </li>
    );
  }

  return (
    <li>
      <button
        className={styles.file}
        data-active={node.path === activePath || node.path === selectedPath ? "true" : "false"}
        draggable
        type="button"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => {
          onSelect(node.path);
          onOpenFile(node.path);
        }}
        onDragStart={(event) => {
          event.dataTransfer.setData("application/x-wnote-workspace-path", node.path);
          event.dataTransfer.effectAllowed = "move";
        }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          const sourcePath = event.dataTransfer.getData("application/x-wnote-workspace-path");
          if (!sourcePath || sourcePath === node.path) return;
          event.preventDefault();
          event.stopPropagation();
          onDropMove(sourcePath, parentPath(node.path));
        }}
        title={node.path}
      >
        <span className={styles.fileIcon}>md</span>
        <span className={styles.name}>{node.name}</span>
        <span className={styles.nodeActions}>
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onRename(node);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onRename(node);
              }
            }}
          >
            改名
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onMove(node);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onMove(node);
              }
            }}
          >
            移动
          </span>
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.stopPropagation();
              onDelete(node);
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onDelete(node);
              }
            }}
          >
            删除
          </span>
        </span>
      </button>
    </li>
  );
}

function parentCreateTarget(tree: WorkspaceTreeNode[], path: string): CreateTarget {
  const parent = parentPath(path);
  const directory = flattenWorkspaceTree(tree).find((node) => node.path === parent);
  return directory ? { parentPath: directory.path, label: directory.name } : { label: "工作区" };
}

function parentPath(path: string): string {
  const index = Math.max(path.lastIndexOf("/"), path.lastIndexOf("\\"));
  return index > 0 ? path.slice(0, index) : "";
}

function pathInDirectory(path: string, directory: string): boolean {
  return (
    path === directory || path.startsWith(`${directory}/`) || path.startsWith(`${directory}\\`)
  );
}

function readCollapsedPaths(): Set<string> {
  try {
    const raw = window.localStorage.getItem(collapsedStorageKey);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeCollapsedPaths(paths: Set<string>): void {
  window.localStorage.setItem(collapsedStorageKey, JSON.stringify([...paths]));
}

import { useState } from "react";
import type { WorkspaceTreeNode } from "@wnote/contracts";
import { hasWorkspaceEntries } from "./workspace-panel-state";
import styles from "./WorkspacePanel.module.css";

type CreateMode = "file" | "directory";
type RenameTarget = { path: string; name: string };
type CreateTarget = { parentPath?: string; label: string };

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
  onDelete?: (path: string) => void;
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
  onDelete,
}: WorkspacePanelProps) {
  const hasEntries = hasWorkspaceEntries(tree);
  const canCreate = Boolean(name);
  const [createMode, setCreateMode] = useState<CreateMode | null>(null);
  const [createTarget, setCreateTarget] = useState<CreateTarget>({ label: "工作区" });
  const [draftName, setDraftName] = useState("");
  const [renameTarget, setRenameTarget] = useState<RenameTarget | null>(null);

  const startCreate = (mode: CreateMode, target: CreateTarget = { label: "工作区" }) => {
    setRenameTarget(null);
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
    setRenameTarget({ path: node.path, name: node.name });
    setDraftName(node.name);
  };

  const submitDelete = (node: WorkspaceTreeNode) => {
    if (!window.confirm(`删除 ${node.name}？`)) return;
    onDelete?.(node.path);
  };

  return (
    <section className={styles.root} aria-label="工作区文件">
      <div className={styles.header}>
        <span className={styles.heading}>{name ?? "工作区"}</span>
        <div className={styles.actions}>
          {canCreate ? (
            <>
              <button
                className={styles.actionButton}
                type="button"
                onClick={() => startCreate("file")}
              >
                + 文件
              </button>
              <button
                className={styles.actionButton}
                type="button"
                onClick={() => startCreate("directory")}
              >
                + 文件夹
              </button>
              <button className={styles.actionButton} type="button" onClick={onRefresh}>
                刷新
              </button>
            </>
          ) : null}
          <button className={styles.openButton} type="button" onClick={onOpenWorkspace}>
            {name ? "切换" : "打开"}
          </button>
        </div>
      </div>
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
          {tree.map((node) => (
            <WorkspaceNode
              key={node.path}
              node={node}
              depth={0}
              activePath={activePath}
              onOpenFile={onOpenFile}
              onRename={startRename}
              onDelete={submitDelete}
              onCreate={startCreate}
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
  onOpenFile,
  onRename,
  onDelete,
  onCreate,
}: {
  node: WorkspaceTreeNode;
  depth: number;
  activePath?: string | null;
  onOpenFile: (filePath: string) => void;
  onRename: (node: WorkspaceTreeNode) => void;
  onDelete: (node: WorkspaceTreeNode) => void;
  onCreate: (mode: CreateMode, target?: CreateTarget) => void;
}) {
  if (node.type === "directory") {
    const target = { parentPath: node.path, label: node.name };
    return (
      <li>
        <details open>
          <summary className={styles.directory} style={{ paddingLeft: `${depth * 12 + 8}px` }}>
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
                onOpenFile={onOpenFile}
                onRename={onRename}
                onDelete={onDelete}
                onCreate={onCreate}
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
        data-active={node.path === activePath ? "true" : "false"}
        type="button"
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
        onClick={() => onOpenFile(node.path)}
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

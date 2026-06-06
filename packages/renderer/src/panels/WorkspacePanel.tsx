import { useState } from "react";
import type { WorkspaceTreeNode } from "@wnote/contracts";
import { hasWorkspaceDocuments } from "./workspace-panel-state";
import styles from "./WorkspacePanel.module.css";

type CreateMode = "file" | "directory";

interface WorkspacePanelProps {
  name?: string;
  tree: WorkspaceTreeNode[];
  activePath?: string | null;
  loading?: boolean;
  onOpenWorkspace: () => void;
  onOpenFile: (filePath: string) => void;
  onCreateFile?: (name: string) => void;
  onCreateDirectory?: (name: string) => void;
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
}: WorkspacePanelProps) {
  const hasDocuments = hasWorkspaceDocuments(tree);
  const canCreate = Boolean(name);
  const [createMode, setCreateMode] = useState<CreateMode | null>(null);
  const [draftName, setDraftName] = useState("");

  const startCreate = (mode: CreateMode) => {
    setCreateMode(mode);
    setDraftName(mode === "file" ? "untitled.md" : "notes");
  };

  const cancelCreate = () => {
    setCreateMode(null);
    setDraftName("");
  };

  const submitCreate = () => {
    const nextName = draftName.trim();
    if (!nextName || !createMode) return;
    if (createMode === "file") onCreateFile?.(nextName);
    if (createMode === "directory") onCreateDirectory?.(nextName);
    cancelCreate();
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
            </>
          ) : null}
          <button className={styles.openButton} type="button" onClick={onOpenWorkspace}>
            {name ? "切换" : "打开"}
          </button>
        </div>
      </div>
      {createMode ? (
        <div className={styles.createForm}>
          <input
            aria-label={createMode === "file" ? "文件名" : "文件夹名"}
            value={draftName}
            autoFocus
            onChange={(event) => setDraftName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") submitCreate();
              if (event.key === "Escape") cancelCreate();
            }}
          />
          <button type="button" onClick={submitCreate}>
            创建
          </button>
          <button type="button" onClick={cancelCreate}>
            取消
          </button>
        </div>
      ) : null}
      {loading ? <p className={styles.empty}>正在读取...</p> : null}
      {!loading && !hasDocuments ? (
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
}: {
  node: WorkspaceTreeNode;
  depth: number;
  activePath?: string | null;
  onOpenFile: (filePath: string) => void;
}) {
  if (node.type === "directory") {
    return (
      <li>
        <details open>
          <summary className={styles.directory} style={{ paddingLeft: `${depth * 12 + 8}px` }}>
            <span className={styles.icon}>▸</span>
            <span className={styles.name}>{node.name}</span>
          </summary>
          <ul className={styles.children}>
            {(node.children ?? []).map((child) => (
              <WorkspaceNode
                key={child.path}
                node={child}
                depth={depth + 1}
                activePath={activePath}
                onOpenFile={onOpenFile}
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
      </button>
    </li>
  );
}

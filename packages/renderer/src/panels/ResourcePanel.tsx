import type { AssetIndex, AssetRef, AssetReference } from "@wnote/contracts";
import styles from "./ResourcePanel.module.css";

interface ResourcePanelProps {
  assets?: AssetIndex;
  onReferenceClick?: (reference: AssetReference) => void;
  onReferenceDelete?: (reference: AssetReference) => void;
  onReferenceRelocate?: (reference: AssetReference) => void;
  onUnusedDelete?: (asset: AssetRef) => void;
  onUnusedDeleteAll?: (assets: AssetRef[]) => void;
}

export function ResourcePanel({
  assets,
  onReferenceClick,
  onReferenceDelete,
  onReferenceRelocate,
  onUnusedDelete,
  onUnusedDeleteAll,
}: ResourcePanelProps) {
  const references = assets?.references ?? [];
  const local = references.filter((reference) => reference.kind === "local");
  const remote = references.filter((reference) => reference.kind === "remote");
  const data = references.filter((reference) => reference.kind === "data");
  const missing = references.filter((reference) => reference.status === "missing");
  const unused = assets?.unused ?? [];

  return (
    <section className={styles.root}>
      <div className={styles.header}>
        <span className={styles.heading}>资源</span>
        <span className={styles.count}>{references.length}</span>
      </div>
      {references.length === 0 ? (
        <p className={styles.empty}>当前文档没有图片资源</p>
      ) : (
        <div className={styles.content}>
          <Summary label="本地" value={local.length} />
          <Summary
            label="缺失"
            value={missing.length}
            tone={missing.length ? "danger" : "normal"}
          />
          <Summary label="远程" value={remote.length} />
          <Summary label="Base64" value={data.length} />
          <Summary label="未引用" value={unused.length} />
          <ResourceGroup
            title="缺失图片"
            references={missing}
            empty="没有缺失图片"
            onReferenceClick={onReferenceClick}
            onReferenceDelete={onReferenceDelete}
            onReferenceRelocate={onReferenceRelocate}
            actions="missing"
          />
          <ResourceGroup
            title="本地图片"
            references={local}
            empty="没有本地图片"
            onReferenceClick={onReferenceClick}
          />
          <ResourceGroup
            title="远程图片"
            references={remote}
            empty="没有远程图片"
            onReferenceClick={onReferenceClick}
          />
          <UnusedGroup
            assets={unused}
            onUnusedDelete={onUnusedDelete}
            onUnusedDeleteAll={onUnusedDeleteAll}
          />
        </div>
      )}
    </section>
  );
}

function UnusedGroup({
  assets,
  onUnusedDelete,
  onUnusedDeleteAll,
}: {
  assets: AssetRef[];
  onUnusedDelete?: (asset: AssetRef) => void;
  onUnusedDeleteAll?: (assets: AssetRef[]) => void;
}) {
  return (
    <div className={styles.group}>
      <div className={styles.groupHeader}>
        <div className={styles.groupTitle}>未引用资源</div>
        {assets.length > 0 ? (
          <button
            className={styles.action}
            data-tone="danger"
            onClick={() => onUnusedDeleteAll?.(assets)}
            type="button"
          >
            清理全部
          </button>
        ) : null}
      </div>
      {assets.length === 0 ? (
        <p className={styles.groupEmpty}>没有未引用资源</p>
      ) : (
        <ul className={styles.list}>
          {assets.map((asset) => (
            <li key={asset.absolutePath}>
              <div className={styles.unusedRow}>
                <div className={styles.unusedItem}>
                  <span className={styles.unusedName}>
                    {asset.originalName ?? asset.markdownPath}
                  </span>
                  <span className={styles.unusedMeta}>{formatSize(asset.size)}</span>
                  <span className={styles.unusedPath}>{asset.markdownPath}</span>
                </div>
                <button
                  className={styles.action}
                  data-tone="danger"
                  onClick={() => onUnusedDelete?.(asset)}
                  type="button"
                >
                  删除
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Summary({
  label,
  value,
  tone = "normal",
}: {
  label: string;
  value: number;
  tone?: "normal" | "danger";
}) {
  return (
    <div className={styles.summary} data-tone={tone}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ResourceGroup({
  title,
  references,
  empty,
  onReferenceClick,
  onReferenceDelete,
  onReferenceRelocate,
  actions = "none",
}: {
  title: string;
  references: AssetReference[];
  empty: string;
  onReferenceClick?: (reference: AssetReference) => void;
  onReferenceDelete?: (reference: AssetReference) => void;
  onReferenceRelocate?: (reference: AssetReference) => void;
  actions?: "none" | "missing";
}) {
  return (
    <div className={styles.group}>
      <div className={styles.groupTitle}>{title}</div>
      {references.length === 0 ? (
        <p className={styles.groupEmpty}>{empty}</p>
      ) : (
        <ul className={styles.list}>
          {references.map((reference, index) => (
            <li key={`${reference.src}-${reference.position}-${index}`}>
              <div className={styles.row}>
                <button className={styles.item} onClick={() => onReferenceClick?.(reference)}>
                  <span className={styles.status} data-status={reference.status}>
                    {statusLabel(reference.status)}
                  </span>
                  <span className={styles.src}>{reference.src}</span>
                </button>
                {actions === "missing" ? (
                  <div className={styles.actions}>
                    <button
                      className={styles.action}
                      onClick={() => onReferenceRelocate?.(reference)}
                      type="button"
                    >
                      定位
                    </button>
                    <button
                      className={styles.action}
                      data-tone="danger"
                      onClick={() => onReferenceDelete?.(reference)}
                      type="button"
                    >
                      删除
                    </button>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function statusLabel(status: AssetReference["status"]): string {
  switch (status) {
    case "ok":
      return "OK";
    case "missing":
      return "缺失";
    case "unknown":
      return "待保存";
    case "external":
      return "外部";
  }
}

function formatSize(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

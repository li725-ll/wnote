import { IpcChannel } from "@wnote/contracts";
import styles from "./TitleBar.module.css";

interface TitleBarProps {
  title: string;
  dirty?: boolean;
  onToggleSidebar?: () => void;
}

function invokeWindow(channel: IpcChannel) {
  void window.electronAPI.invoke(channel);
}

export function TitleBar({ title, dirty = false, onToggleSidebar }: TitleBarProps) {
  const platform = window.electronAPI.platform;
  const isMac = platform === "darwin";

  return (
    <header
      className={styles.titleBar}
      data-platform={isMac ? "mac" : "windows"}
      onDoubleClick={() => invokeWindow(IpcChannel.WindowMaximize)}
    >
      <div className={styles.left} onDoubleClick={(event) => event.stopPropagation()}>
        {isMac ? <WindowControls platform="mac" /> : null}
        {onToggleSidebar ? (
          <button
            className={styles.sidebarButton}
            type="button"
            aria-label="切换侧边栏"
            title="切换侧边栏"
            onClick={onToggleSidebar}
          >
            <span aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <div className={styles.title} title={title}>
        <span className={styles.brand}>WNote</span>
        <span className={styles.separator}>/</span>
        <span className={styles.document}>{title}</span>
        {dirty ? <span className={styles.dirty} aria-label="未保存" /> : null}
      </div>
      <div className={styles.spacer}>{isMac ? null : <WindowControls platform="windows" />}</div>
    </header>
  );
}

function WindowControls({ platform }: { platform: "mac" | "windows" }) {
  const controls =
    platform === "mac"
      ? [
          { kind: "close", label: "关闭窗口", channel: IpcChannel.WindowClose },
          { kind: "minimize", label: "最小化窗口", channel: IpcChannel.WindowMinimize },
          { kind: "maximize", label: "最大化窗口", channel: IpcChannel.WindowMaximize },
        ]
      : [
          { kind: "minimize", label: "最小化窗口", channel: IpcChannel.WindowMinimize },
          { kind: "maximize", label: "最大化窗口", channel: IpcChannel.WindowMaximize },
          { kind: "close", label: "关闭窗口", channel: IpcChannel.WindowClose },
        ];

  return (
    <div className={styles.controls} data-platform={platform} aria-label="窗口控制">
      {controls.map((control) => (
        <button
          key={control.kind}
          className={styles.control}
          data-kind={control.kind}
          type="button"
          aria-label={control.label}
          onClick={() => invokeWindow(control.channel)}
        />
      ))}
    </div>
  );
}

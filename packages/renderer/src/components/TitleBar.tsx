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
  return (
    <header
      className={styles.titleBar}
      onDoubleClick={() => invokeWindow(IpcChannel.WindowMaximize)}
    >
      <div className={styles.left} onDoubleClick={(event) => event.stopPropagation()}>
        <div className={styles.controls} aria-label="窗口控制">
          <button
            className={styles.control}
            data-kind="close"
            type="button"
            aria-label="关闭窗口"
            onClick={() => invokeWindow(IpcChannel.WindowClose)}
          />
          <button
            className={styles.control}
            data-kind="minimize"
            type="button"
            aria-label="最小化窗口"
            onClick={() => invokeWindow(IpcChannel.WindowMinimize)}
          />
          <button
            className={styles.control}
            data-kind="maximize"
            type="button"
            aria-label="最大化窗口"
            onClick={() => invokeWindow(IpcChannel.WindowMaximize)}
          />
        </div>
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
      <div className={styles.spacer} />
    </header>
  );
}

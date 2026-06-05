import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { IpcChannel, type LayoutState } from "@wnote/contracts";
import styles from "./AppLayout.module.css";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  left: ReactNode;
  center: ReactNode;
  toggleLeftSignal?: number;
}

const MIN_WIDTH = 160;
const MAX_WIDTH = 480;

function saveLayout(partial: Partial<LayoutState>) {
  window.electronAPI.invoke(IpcChannel.LayoutSet, partial);
}

export function AppLayout({ left, center, toggleLeftSignal = 0 }: AppLayoutProps) {
  const [layout, setLayout] = useState<
    Pick<LayoutState, "leftOpen" | "leftWidth"> & {
      loaded: boolean;
    }
  >({
    leftOpen: true,
    leftWidth: 320,
    loaded: false,
  });
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);
  const { leftOpen, leftWidth } = layout;

  useEffect(() => {
    window.electronAPI.invoke<LayoutState>(IpcChannel.LayoutGet).then((state) => {
      setLayout({ leftOpen: state.leftOpen, leftWidth: state.leftWidth, loaded: true });
    });
  }, []);

  useEffect(() => {
    if (toggleLeftSignal === 0) return;
    // eslint-disable-next-line @eslint-react/set-state-in-effect -- external menu signal intentionally updates layout state.
    setLayout((prev) => {
      const next = { ...prev, leftOpen: !prev.leftOpen };
      saveLayout({ leftOpen: next.leftOpen });
      return next;
    });
  }, [toggleLeftSignal]);

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const side = args[0] as string;
      if (side === "left") {
        setLayout((prev) => {
          const next = { ...prev, leftOpen: !prev.leftOpen };
          saveLayout({ leftOpen: next.leftOpen });
          return next;
        });
      }
    };
    window.electronAPI.on(IpcChannel.ToggleSidebar, handler);
    return () => window.electronAPI.off(IpcChannel.ToggleSidebar, handler);
  }, []);

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      setDragging(true);
      startXRef.current = e.clientX;
      startWidthRef.current = leftWidth;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [leftWidth],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging) return;
      const delta = e.clientX - startXRef.current;
      const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidthRef.current + delta));
      setLayout((prev) => ({ ...prev, leftWidth: newWidth }));
    },
    [dragging],
  );

  const onPointerUp = useCallback(() => {
    if (dragging) saveLayout({ leftWidth });
    setDragging(false);
  }, [dragging, leftWidth]);

  const style = {
    "--left-width": leftOpen ? `${leftWidth}px` : "0px",
  } as React.CSSProperties;

  if (!layout.loaded) return null;

  return (
    <div className={`${styles.layout} ${dragging ? styles.dragging : ""}`} style={style}>
      <Sidebar side="left">{left}</Sidebar>
      <div
        className={styles.resizer}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
      <main className={styles.center}>{center}</main>
    </div>
  );
}

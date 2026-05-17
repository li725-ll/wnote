import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { IpcChannel } from "@wnote/shared";
import type { LayoutState } from "@wnote/shared";
import styles from "./AppLayout.module.css";
import { Sidebar } from "./Sidebar";

interface AppLayoutProps {
  left: ReactNode;
  center: ReactNode;
}

const MIN_WIDTH = 160;
const MAX_WIDTH = 480;

function saveLayout(partial: Partial<LayoutState>) {
  window.electronAPI.invoke(IpcChannel.LayoutSet, partial);
}

export function AppLayout({ left, center }: AppLayoutProps) {
  const [leftWidth, setLeftWidth] = useState(320);
  const [leftOpen, setLeftOpen] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  useEffect(() => {
    window.electronAPI.invoke<LayoutState>(IpcChannel.LayoutGet).then((state) => {
      setLeftOpen(state.leftOpen);
      setLeftWidth(state.leftWidth);
      setLoaded(true);
    });
  }, []);

  useEffect(() => {
    const handler = (...args: unknown[]) => {
      const side = args[0] as string;
      if (side === "left") {
        setLeftOpen((prev) => {
          saveLayout({ leftOpen: !prev });
          return !prev;
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
      setLeftWidth(newWidth);
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

  if (!loaded) return null;

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

import { useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { undo, redo, selectAll } from "@codemirror/commands";
import type { EditorView } from "@codemirror/view";
import styles from "./ContextMenu.module.css";

interface ContextMenuProps {
  x: number;
  y: number;
  view: EditorView;
  onClose: () => void;
}

const isMac = navigator.platform.startsWith("Mac");
const mod = isMac ? "⌘" : "Ctrl+";

interface MenuItem {
  label: string;
  shortcut: string;
  action: (view: EditorView) => void;
  disabled?: (view: EditorView) => boolean;
}

const hasSelection = (view: EditorView) => view.state.selection.main.empty;

const menuItems: (MenuItem | "separator")[] = [
  {
    label: "撤销",
    shortcut: `${mod}Z`,
    action: (view) => undo(view),
  },
  {
    label: "重做",
    shortcut: isMac ? "⌘⇧Z" : "Ctrl+Y",
    action: (view) => redo(view),
  },
  "separator",
  {
    label: "剪切",
    shortcut: `${mod}X`,
    action: (view) => {
      document.execCommand("cut");
      view.focus();
    },
    disabled: hasSelection,
  },
  {
    label: "复制",
    shortcut: `${mod}C`,
    action: (view) => {
      document.execCommand("copy");
      view.focus();
    },
    disabled: hasSelection,
  },
  {
    label: "粘贴",
    shortcut: `${mod}V`,
    action: (view) => {
      navigator.clipboard.readText().then((text) => {
        if (text) {
          const { from, to } = view.state.selection.main;
          view.dispatch({ changes: { from, to, insert: text } });
        }
        view.focus();
      });
    },
  },
  "separator",
  {
    label: "全选",
    shortcut: `${mod}A`,
    action: (view) => {
      selectAll(view);
      view.focus();
    },
  },
];

export function ContextMenu({ x, y, view, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  const handleAction = useCallback(
    (item: MenuItem) => {
      item.action(view);
      onClose();
    },
    [view, onClose],
  );

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const rect = menu.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      menu.style.left = `${window.innerWidth - rect.width - 4}px`;
    }
    if (rect.bottom > window.innerHeight) {
      menu.style.top = `${window.innerHeight - rect.height - 4}px`;
    }
  }, [x, y]);

  return createPortal(
    <div ref={menuRef} className={styles.menu} style={{ left: x, top: y }}>
      {menuItems.map((item, i) =>
        item === "separator" ? (
          <div key={i} className={styles.separator} />
        ) : (
          <button
            key={item.label}
            className={styles.item}
            data-disabled={item.disabled?.(view) ?? false}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => handleAction(item)}
          >
            <span>{item.label}</span>
            <span className={styles.shortcut}>{item.shortcut}</span>
          </button>
        ),
      )}
    </div>,
    document.body,
  );
}

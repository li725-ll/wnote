import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./CommandPalette.module.css";

export interface PaletteCommand {
  id: string;
  label: string;
  keywords: string[];
  group: string;
  shortcut?: string;
  run: () => void | Promise<void>;
}

interface CommandPaletteProps {
  open: boolean;
  commands: PaletteCommand[];
  onClose: () => void;
}

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function commandMatches(command: PaletteCommand, query: string): boolean {
  if (!query) return true;
  const haystack = [command.label, command.group, command.shortcut ?? "", ...command.keywords]
    .join(" ")
    .toLowerCase();
  return query
    .split(/\s+/)
    .filter(Boolean)
    .every((part) => haystack.includes(part));
}

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = normalize(query);
    return commands.filter((command) => commandMatches(command, q)).slice(0, 12);
  }, [commands, query]);

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    setSelected((value) => Math.min(value, Math.max(filtered.length - 1, 0)));
  }, [filtered.length]);

  if (!open) return null;

  const runCommand = (command: PaletteCommand | undefined) => {
    if (!command) return;
    onClose();
    void command.run();
  };

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div className={styles.palette} onMouseDown={(event) => event.stopPropagation()}>
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          placeholder="输入命令..."
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
              return;
            }
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setSelected((value) => Math.min(value + 1, filtered.length - 1));
              return;
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setSelected((value) => Math.max(value - 1, 0));
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              runCommand(filtered[selected]);
            }
          }}
        />
        <div className={styles.list}>
          {filtered.length === 0 ? (
            <div className={styles.empty}>无匹配命令</div>
          ) : (
            filtered.map((command, index) => (
              <button
                key={command.id}
                className={`${styles.item} ${index === selected ? styles.selected : ""}`}
                onMouseEnter={() => setSelected(index)}
                onClick={() => runCommand(command)}
              >
                <span className={styles.itemText}>
                  <span className={styles.label}>{command.label}</span>
                  <span className={styles.group}>{command.group}</span>
                </span>
                {command.shortcut && <span className={styles.shortcut}>{command.shortcut}</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

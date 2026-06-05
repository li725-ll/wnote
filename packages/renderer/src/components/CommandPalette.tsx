import { useEffect, useMemo, useRef, useState } from "react";
import {
  clampCommandPaletteSelected,
  filterCommandPaletteCommands,
  nextCommandPaletteSelected,
  reconcileCommandPaletteSelected,
  type CommandPaletteNavigationKey,
} from "./command-palette-state";
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

const navigationKeys = new Set<string>(["ArrowDown", "ArrowUp", "Home", "End"]);
const paletteId = "wnote-command-palette";
const listId = `${paletteId}-list`;

export function CommandPalette({ open, commands, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const previousQueryRef = useRef(query);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => filterCommandPaletteCommands(commands, query), [commands, query]);
  const clampedSelected = clampCommandPaletteSelected(selected, filtered.length);
  const activeOptionId = filtered.length ? `${listId}-option-${clampedSelected}` : undefined;

  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    previousQueryRef.current = "";
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  useEffect(() => {
    const previousQuery = previousQueryRef.current;
    setSelected((value) =>
      reconcileCommandPaletteSelected({
        selected: value,
        itemCount: filtered.length,
        queryChanged: previousQuery !== query,
      }),
    );
    previousQueryRef.current = query;
  }, [filtered.length, query]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, query, selected]);

  if (!open) return null;

  const runCommand = (command: PaletteCommand | undefined) => {
    if (!command) return;
    onClose();
    void command.run();
  };

  return (
    <div className={styles.overlay} onMouseDown={onClose}>
      <div
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label="命令面板"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <input
          ref={inputRef}
          className={styles.input}
          value={query}
          placeholder="输入命令..."
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={activeOptionId}
          aria-autocomplete="list"
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              onClose();
              return;
            }
            if (navigationKeys.has(event.key)) {
              event.preventDefault();
              setSelected((value) =>
                nextCommandPaletteSelected(
                  value,
                  filtered.length,
                  event.key as CommandPaletteNavigationKey,
                ),
              );
              return;
            }
            if (event.key === "Enter") {
              event.preventDefault();
              runCommand(filtered[clampedSelected]);
            }
          }}
        />
        <div ref={listRef} className={styles.list} id={listId} role="listbox" aria-label="命令">
          {filtered.length === 0 ? (
            <div className={styles.empty}>无匹配命令</div>
          ) : (
            filtered.map((command, index) => (
              <button
                key={command.id}
                className={`${styles.item} ${index === clampedSelected ? styles.selected : ""}`}
                data-active={index === clampedSelected ? "true" : "false"}
                id={`${listId}-option-${index}`}
                role="option"
                aria-selected={index === clampedSelected}
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

import { useCallback, useEffect, useRef, useState } from "react";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { slashCommands, type EditorCommandDefinition } from "./editor-commands";
import { belowFloatingPoint } from "./floating-position";
import styles from "./SlashMenu.module.css";

interface SlashMenuProps {
  editor: TiptapEditor | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

interface SlashState {
  visible: boolean;
  left: number;
  top: number;
  from: number;
  to: number;
  query: string;
  selected: number;
  placement: "top" | "bottom";
}

const hiddenState: SlashState = {
  visible: false,
  left: 0,
  top: 0,
  from: 0,
  to: 0,
  query: "",
  selected: 0,
  placement: "bottom",
};

const slashMenuBox = { width: 288, height: 416 };

export function SlashMenu({ editor, containerRef }: SlashMenuProps) {
  const [state, setState] = useState<SlashState>(hiddenState);
  const menuRef = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setState(hiddenState);
      return;
    }

    const trigger = slashTrigger(editor);
    const container = containerRef.current;
    if (!trigger || !container) {
      setState((current) => (current.visible ? hiddenState : current));
      return;
    }

    const coords = editor.view.coordsAtPos(trigger.to);
    const containerRect = container.getBoundingClientRect();
    const position = belowFloatingPoint(
      {
        left: coords.left,
        right: coords.right,
        top: coords.top,
        bottom: coords.bottom,
        width: coords.right - coords.left,
        height: coords.bottom - coords.top,
      },
      {
        ...containerRect,
        scrollLeft: container.scrollLeft,
        scrollTop: container.scrollTop,
      },
      slashMenuBox,
    );
    setState((current) => ({
      visible: true,
      left: position.left,
      top: position.top,
      from: trigger.from,
      to: trigger.to,
      query: trigger.query,
      placement: position.placement,
      selected: boundedSelected(
        current.visible ? current.selected : 0,
        slashCommands(trigger.query),
      ),
    }));
  }, [containerRef, editor]);

  useEffect(() => {
    if (!editor) return;
    editor.on("selectionUpdate", update);
    editor.on("transaction", update);
    editor.on("blur", update);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("transaction", update);
      editor.off("blur", update);
    };
  }, [editor, update]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener("scroll", update);
    window.addEventListener("resize", update);
    return () => {
      container.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [containerRef, update]);

  useEffect(() => {
    if (!editor || !state.visible) return;
    const handler = (event: KeyboardEvent) => {
      const commands = slashCommands(state.query);
      if (!commands.length) {
        if (event.key === "Escape") {
          event.preventDefault();
          setState(hiddenState);
        }
        return;
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setState((current) => ({
          ...current,
          selected: (current.selected + 1) % slashCommands(current.query).length,
        }));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setState((current) => ({
          ...current,
          selected:
            (current.selected + slashCommands(current.query).length - 1) %
            slashCommands(current.query).length,
        }));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        setState((current) => {
          const currentCommands = slashCommands(current.query);
          execute(editor, current, currentCommands[current.selected]);
          return hiddenState;
        });
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setState(hiddenState);
      }
    };

    editor.view.dom.addEventListener("keydown", handler);
    return () => editor.view.dom.removeEventListener("keydown", handler);
  }, [editor, state.visible]);

  useEffect(() => {
    if (!state.visible) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (target && menuRef.current?.contains(target)) return;
      setState(hiddenState);
    };
    window.addEventListener("mousedown", close);
    return () => window.removeEventListener("mousedown", close);
  }, [state.visible]);

  if (!editor || !state.visible) return null;
  const commands = slashCommands(state.query);

  return (
    <div
      ref={menuRef}
      className={styles.menu}
      contentEditable={false}
      data-placement={state.placement}
      style={{ left: state.left, top: state.top }}
      onMouseDown={(event) => event.preventDefault()}
    >
      {commands.length ? (
        commands.map((item, index) => (
          <button
            key={item.id}
            className={styles.item}
            data-active={index === state.selected ? "true" : "false"}
            type="button"
            onMouseEnter={() => setState((current) => ({ ...current, selected: index }))}
            onClick={() => {
              execute(editor, state, item);
              setState(hiddenState);
            }}
          >
            <span className={styles.label}>{item.label}</span>
            <span className={styles.hint}>{item.hint}</span>
          </button>
        ))
      ) : (
        <div className={styles.empty}>没有匹配的命令</div>
      )}
    </div>
  );
}

function slashTrigger(editor: TiptapEditor): { from: number; to: number; query: string } | null {
  const { selection } = editor.state;
  if (!selection.empty) return null;
  const { $from } = selection;
  const parent = $from.parent;
  if (!parent.isTextblock || parent.type.name === "codeBlock") return null;

  const textBefore = parent.textBetween(0, $from.parentOffset, "\n", "\n");
  const match = /^\/([^\s/]*)$/.exec(textBefore.trim());
  if (!match) return null;

  return { from: selection.from - textBefore.length, to: selection.from, query: match[1] ?? "" };
}

function execute(
  editor: TiptapEditor,
  state: SlashState,
  item: EditorCommandDefinition | undefined,
) {
  if (!item) return;
  editor.chain().focus().deleteRange({ from: state.from, to: state.to }).run();
  item.run(editor);
}

function boundedSelected(selected: number, commands: EditorCommandDefinition[]) {
  if (!commands.length) return 0;
  return Math.min(selected, commands.length - 1);
}

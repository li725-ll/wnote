import { EditorView, showTooltip, keymap } from "@codemirror/view";
import type { Tooltip, TooltipView } from "@codemirror/view";
import { StateField, Prec } from "@codemirror/state";
import {
  slashCommandState,
  openSlashMenu,
  closeSlashMenu,
  navigateSlashMenu,
  confirmSlashItem,
} from "./state";
import type { SlashCommand } from "./commands";

function executeCommand(view: EditorView, cmd: SlashCommand) {
  const state = view.state.field(slashCommandState);
  const from = state.from - 1;
  const to = view.state.selection.main.head;

  view.dispatch({
    changes: { from, to, insert: "" },
    effects: closeSlashMenu.of(undefined),
  });

  cmd.action.run(view);
}

function createTooltipDOM(view: EditorView): TooltipView {
  const dom = document.createElement("div");
  dom.className = "cm-slash-menu";
  dom.setAttribute("role", "listbox");

  function render() {
    const state = view.state.field(slashCommandState);
    if (!state.active) {
      dom.style.display = "none";
      return;
    }
    dom.style.display = "";
    dom.innerHTML = "";

    if (state.filtered.length === 0) {
      const empty = document.createElement("div");
      empty.className = "cm-slash-empty";
      empty.textContent = "无匹配指令";
      dom.appendChild(empty);
      return;
    }

    let currentCategory = "";
    state.filtered.forEach((cmd, i) => {
      if (cmd.category !== currentCategory) {
        currentCategory = cmd.category;
        const header = document.createElement("div");
        header.className = "cm-slash-category";
        const categoryLabels: Record<string, string> = {
          heading: "标题",
          block: "块",
          inline: "行内",
        };
        header.textContent = categoryLabels[currentCategory] ?? currentCategory;
        dom.appendChild(header);
      }

      const item = document.createElement("div");
      item.className = "cm-slash-item" + (i === state.selectedIndex ? " cm-slash-selected" : "");
      item.setAttribute("role", "option");
      item.setAttribute("aria-selected", String(i === state.selectedIndex));

      const icon = document.createElement("span");
      icon.className = "cm-slash-icon";
      icon.textContent = cmd.icon;

      const label = document.createElement("span");
      label.className = "cm-slash-label";
      label.textContent = cmd.label;

      const trigger = document.createElement("span");
      trigger.className = "cm-slash-trigger";
      trigger.textContent = `/${cmd.trigger}`;

      item.appendChild(icon);
      item.appendChild(label);
      item.appendChild(trigger);

      item.addEventListener("pointerdown", (e) => {
        e.preventDefault();
        executeCommand(view, cmd);
      });

      dom.appendChild(item);
    });
  }

  render();
  return {
    dom,
    update() {
      render();
    },
  };
}

const slashTooltipField = StateField.define<readonly Tooltip[]>({
  create() {
    return [];
  },
  update(tooltips, tr) {
    const state = tr.state.field(slashCommandState);
    if (!state.active) return [];
    return [
      {
        pos: state.from - 1,
        above: false,
        strictSide: true,
        arrow: false,
        create: (view: EditorView) => createTooltipDOM(view),
      },
    ];
  },
  provide: (f) => showTooltip.computeN([f], (state) => state.field(f)),
});

const slashKeymap = Prec.highest(
  keymap.of([
    {
      key: "ArrowDown",
      run: (view) => {
        const state = view.state.field(slashCommandState);
        if (!state.active) return false;
        view.dispatch({ effects: navigateSlashMenu.of("down") });
        return true;
      },
    },
    {
      key: "ArrowUp",
      run: (view) => {
        const state = view.state.field(slashCommandState);
        if (!state.active) return false;
        view.dispatch({ effects: navigateSlashMenu.of("up") });
        return true;
      },
    },
    {
      key: "Enter",
      run: (view) => {
        const state = view.state.field(slashCommandState);
        if (!state.active || state.filtered.length === 0) return false;
        executeCommand(view, state.filtered[state.selectedIndex]);
        return true;
      },
    },
    {
      key: "Escape",
      run: (view) => {
        const state = view.state.field(slashCommandState);
        if (!state.active) return false;
        view.dispatch({ effects: closeSlashMenu.of(undefined) });
        return true;
      },
    },
    {
      key: "Tab",
      run: (view) => {
        const state = view.state.field(slashCommandState);
        if (!state.active || state.filtered.length === 0) return false;
        executeCommand(view, state.filtered[state.selectedIndex]);
        return true;
      },
    },
  ]),
);

const slashInputHandler = EditorView.inputHandler.of((view, from, to, text) => {
  if (text !== "/") return false;
  const line = view.state.doc.lineAt(from);
  const before = view.state.sliceDoc(line.from, from);
  if (before.length === 0 || /\s$/.test(before)) {
    setTimeout(() => {
      view.dispatch({ effects: openSlashMenu.of({ from: from + 1 }) });
    });
  }
  return false;
});

export const slashCommandView = [slashTooltipField, slashKeymap, slashInputHandler];

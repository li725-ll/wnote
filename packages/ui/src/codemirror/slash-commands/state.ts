import { StateField, StateEffect } from "@codemirror/state";
import type { SlashCommand } from "./commands";
import { slashCommandRegistry } from "./commands";
import { fuzzyMatch } from "./fuzzy";

export interface SlashCommandState {
  active: boolean;
  from: number;
  query: string;
  filtered: SlashCommand[];
  selectedIndex: number;
}

const inactive: SlashCommandState = {
  active: false,
  from: 0,
  query: "",
  filtered: [],
  selectedIndex: 0,
};

export const openSlashMenu = StateEffect.define<{ from: number }>();
export const closeSlashMenu = StateEffect.define<void>();
export const updateSlashQuery = StateEffect.define<string>();
export const navigateSlashMenu = StateEffect.define<"up" | "down">();
export const confirmSlashItem = StateEffect.define<void>();

function filterCommands(query: string): SlashCommand[] {
  if (query.length === 0) return slashCommandRegistry;
  const q = query.toLowerCase();
  const scored = slashCommandRegistry
    .map((cmd) => {
      let score = fuzzyMatch(query, [cmd.trigger, cmd.label, cmd.id, ...cmd.keywords]);
      if (cmd.trigger.toLowerCase().startsWith(q)) score += 10;
      return { cmd, score };
    })
    .filter((x) => x.score > 0);
  scored.sort((a, b) => b.score - a.score);
  return scored.map((x) => x.cmd);
}

export const slashCommandState = StateField.define<SlashCommandState>({
  create: () => inactive,
  update(state, tr) {
    for (const e of tr.effects) {
      if (e.is(openSlashMenu)) {
        const filtered = filterCommands("");
        return { active: true, from: e.value.from, query: "", filtered, selectedIndex: 0 };
      }
      if (e.is(closeSlashMenu)) {
        return inactive;
      }
      if (e.is(updateSlashQuery)) {
        const query = e.value;
        const filtered = filterCommands(query);
        return {
          ...state,
          query,
          filtered,
          selectedIndex: Math.min(state.selectedIndex, Math.max(0, filtered.length - 1)),
        };
      }
      if (e.is(navigateSlashMenu)) {
        if (!state.active || state.filtered.length === 0) return state;
        const dir = e.value === "up" ? -1 : 1;
        const len = state.filtered.length;
        const next = (state.selectedIndex + dir + len) % len;
        return { ...state, selectedIndex: next };
      }
    }

    if (!state.active && tr.docChanged) {
      const cursor = tr.state.selection.main.head;
      const line = tr.state.doc.lineAt(cursor);
      const lineText = tr.state.sliceDoc(line.from, cursor);
      const slashIdx = lineText.lastIndexOf("/");
      if (slashIdx >= 0) {
        const before = lineText.slice(0, slashIdx);
        if (before.length === 0 || /\s$/.test(before)) {
          const afterSlash = lineText.slice(slashIdx + 1);
          if (!afterSlash.includes(" ") && !afterSlash.includes("\n")) {
            const from = line.from + slashIdx + 1;
            const filtered = filterCommands(afterSlash);
            return { active: true, from, query: afterSlash, filtered, selectedIndex: 0 };
          }
        }
      }
    }

    if (state.active && tr.docChanged) {
      const newFrom = tr.changes.mapPos(state.from, -1);
      if (newFrom <= 0) return inactive;
      const cursor = tr.state.selection.main.head;
      if (cursor < newFrom) return inactive;
      const query = tr.state.sliceDoc(newFrom, cursor);
      if (query.includes(" ") || query.includes("\n")) return inactive;
      const filtered = filterCommands(query);
      return {
        ...state,
        from: newFrom,
        query,
        filtered,
        selectedIndex: Math.min(state.selectedIndex, Math.max(0, filtered.length - 1)),
      };
    }

    if (state.active && tr.selection) {
      const cursor = tr.state.selection.main.head;
      if (cursor < state.from) return inactive;
    }

    return state;
  },
});

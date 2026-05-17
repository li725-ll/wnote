import type { EditorState, EditorAction } from "./types";

export const initialState: EditorState = {
  blocks: [],
  focusedId: null,
  focusDirection: null,
  theme: "light",
  mode: "wysiwyg",
};

export function editorReducer(state: EditorState, action: EditorAction): EditorState {
  switch (action.type) {
    case "INIT":
      return { ...state, blocks: action.blocks, focusedId: null, focusDirection: null };

    case "FOCUS":
      return { ...state, focusedId: action.id, focusDirection: action.direction ?? "click" };

    case "BLUR":
      return { ...state, focusedId: null, focusDirection: null };

    case "UPDATE_BLOCK":
      return {
        ...state,
        blocks: state.blocks.map((b) => (b.id === action.id ? { ...b, node: action.node } : b)),
      };

    case "INSERT_AFTER": {
      const idx = state.blocks.findIndex((b) => b.id === action.afterId);
      if (idx === -1) return state;
      const blocks = [...state.blocks];
      blocks.splice(idx + 1, 0, action.block);
      return { ...state, blocks, focusedId: action.block.id, focusDirection: "down" };
    }

    case "DELETE_BLOCK": {
      const idx = state.blocks.findIndex((b) => b.id === action.id);
      if (idx === -1) return state;
      const blocks = state.blocks.filter((b) => b.id !== action.id);
      const newFocusId = blocks[Math.max(0, idx - 1)]?.id ?? null;
      return { ...state, blocks, focusedId: newFocusId, focusDirection: "up" };
    }

    case "MOVE_FOCUS": {
      if (!state.focusedId) return state;
      const idx = state.blocks.findIndex((b) => b.id === state.focusedId);
      const nextIdx = action.direction === "up" ? idx - 1 : idx + 1;
      const target = state.blocks[nextIdx];
      if (!target) return state;
      return { ...state, focusedId: target.id, focusDirection: action.direction };
    }

    case "SET_THEME":
      return { ...state, theme: action.theme };

    case "SET_MODE":
      return { ...state, mode: action.mode, focusedId: null, focusDirection: null };

    default:
      return state;
  }
}

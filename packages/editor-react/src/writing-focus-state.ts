export interface WritingFocusInput {
  editorFocused: boolean;
  gutterActive: boolean;
  menuOpen: boolean;
}

export interface WritingFocusState {
  focused: boolean;
  toolsVisible: boolean;
}

export function writingFocusState(input: WritingFocusInput): WritingFocusState {
  return {
    focused: input.editorFocused,
    toolsVisible: input.gutterActive || input.menuOpen,
  };
}

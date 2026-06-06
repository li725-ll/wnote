export interface LayoutState {
  leftOpen: boolean;
  leftWidth: number;
}

export const defaultLayoutState: LayoutState = {
  leftOpen: false,
  leftWidth: 320,
};

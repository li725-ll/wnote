export interface LayoutState {
  leftOpen: boolean;
  leftWidth: number;
}

export const defaultLayoutState: LayoutState = {
  leftOpen: true,
  leftWidth: 320,
};

import { create } from "zustand";
import type { ToastState } from "../components/Toast";
import { defaultExportOptions, type ExportFormat } from "../export/export-state";
import type { ExportHtmlOptions } from "@wnote/contracts";

interface UiStore {
  paletteOpen: boolean;
  exportDialogOpen: boolean;
  exportFormat: ExportFormat;
  exportOptions: Required<ExportHtmlOptions>;
  toggleOutlineSignal: number;
  toast: ToastState | null;
  setPaletteOpen: (open: boolean) => void;
  togglePalette: () => void;
  setExportDialogOpen: (open: boolean) => void;
  setExportFormat: (format: ExportFormat) => void;
  setExportOptions: (options: Required<ExportHtmlOptions>) => void;
  triggerToggleOutline: () => void;
  setToast: (toast: ToastState | null) => void;
}

export const useUiStore = create<UiStore>((set) => ({
  paletteOpen: false,
  exportDialogOpen: false,
  exportFormat: "html",
  exportOptions: defaultExportOptions,
  toggleOutlineSignal: 0,
  toast: null,
  setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
  togglePalette: () => set((state) => ({ paletteOpen: !state.paletteOpen })),
  setExportDialogOpen: (exportDialogOpen) => set({ exportDialogOpen }),
  setExportFormat: (exportFormat) => set({ exportFormat }),
  setExportOptions: (exportOptions) => set({ exportOptions }),
  triggerToggleOutline: () =>
    set((state) => ({ toggleOutlineSignal: state.toggleOutlineSignal + 1 })),
  setToast: (toast) => set({ toast }),
}));

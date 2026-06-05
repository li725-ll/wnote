import { useEffect } from "react";
import { isCommandPaletteToggleKey } from "../components/command-palette-state";

export function useCommandPaletteShortcut(onToggle: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!isCommandPaletteToggleKey(event)) return;
      event.preventDefault();
      onToggle();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onToggle]);
}

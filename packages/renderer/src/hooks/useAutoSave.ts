import { useCallback, useEffect, useRef } from "react";
import { shouldScheduleAutoSave } from "./auto-save-state";

export function useAutoSave(enabled: boolean, save: () => void | Promise<void>, delay = 2000) {
  const enabledRef = useRef(enabled);
  const saveRef = useRef(save);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  enabledRef.current = enabled;
  saveRef.current = save;

  const clearAutoSave = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  useEffect(() => clearAutoSave, [clearAutoSave]);

  const scheduleAutoSave = useCallback(
    (documentPath: string | null) => {
      clearAutoSave();
      if (!shouldScheduleAutoSave(enabledRef.current, documentPath)) return;
      timerRef.current = setTimeout(() => {
        void saveRef.current();
      }, delay);
    },
    [clearAutoSave, delay],
  );

  return { scheduleAutoSave, clearAutoSave };
}

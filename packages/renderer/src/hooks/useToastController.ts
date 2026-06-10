import { useCallback, useEffect, useRef } from "react";
import type { ToastState } from "../components/Toast";
import { useUiStore } from "../stores/ui-store";

export function useToastController() {
  const toast = useUiStore((state) => state.toast);
  const setToast = useUiStore((state) => state.setToast);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearToastTimer = useCallback(() => {
    if (!toastTimerRef.current) return;
    clearTimeout(toastTimerRef.current);
    toastTimerRef.current = null;
  }, []);

  useEffect(() => clearToastTimer, [clearToastTimer]);

  const closeToast = useCallback(() => {
    clearToastTimer();
    setToast(null);
  }, [clearToastTimer]);

  const showToast = useCallback(
    (next: Omit<ToastState, "id">, duration = 3200) => {
      clearToastTimer();
      setToast({ ...next, id: Date.now() });
      if (duration > 0) {
        toastTimerRef.current = setTimeout(() => setToast(null), duration);
      }
    },
    [clearToastTimer],
  );

  return { toast, showToast, closeToast };
}

import styles from "./Toast.module.css";

export interface ToastAction {
  label: string;
  run(): void;
}

export interface ToastState {
  id: number;
  kind: "info" | "success" | "error";
  title: string;
  message?: string;
  actions?: ToastAction[];
}

interface ToastProps {
  toast: ToastState | null;
  onClose(): void;
}

export function Toast({ toast, onClose }: ToastProps) {
  if (!toast) return null;
  return (
    <div className={styles.toast} data-kind={toast.kind} role="status" aria-live="polite">
      <div className={styles.title}>{toast.title}</div>
      {toast.message ? <div className={styles.message}>{toast.message}</div> : null}
      {toast.actions?.length ? (
        <div className={styles.actions}>
          {toast.actions.map((action) => (
            <button
              key={action.label}
              className={styles.button}
              type="button"
              onClick={() => {
                action.run();
                onClose();
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

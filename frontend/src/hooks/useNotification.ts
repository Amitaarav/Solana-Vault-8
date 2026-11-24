import { useState, useCallback } from "react";
import { NotificationState } from "../types/vault";

export function useNotification(autoDismissMs = 6000) {
  const [notification, setNotification] = useState<NotificationState | null>(null);

  const show = useCallback(
    (message: string, type: NotificationState["type"] = "success") => {
      setNotification({ message, type });
      if (autoDismissMs > 0) {
        setTimeout(() => {
          setNotification((curr) => (curr?.message === message ? null : curr));
        }, autoDismissMs);
      }
    },
    [autoDismissMs]
  );

  const dismiss = useCallback(() => {
    setNotification(null);
  }, []);

  return {
    notification,
    show,
    dismiss,
    success: (msg: string) => show(msg, "success"),
    error: (msg: string) => show(msg, "error"),
    info: (msg: string) => show(msg, "info"),
  };
}

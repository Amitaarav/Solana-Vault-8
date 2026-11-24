import React from "react";

export type AlertType = "success" | "error" | "info" | "warning";

export interface AlertProps {
  type: AlertType;
  message: string;
  onClose?: () => void;
  className?: string;
}

export const Alert: React.FC<AlertProps> = ({
  type,
  message,
  onClose,
  className = "",
}) => {
  const styles: Record<AlertType, string> = {
    success:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
    error:
      "border-rose-500/30 bg-rose-500/10 text-rose-300",
    warning:
      "border-amber-500/30 bg-amber-500/10 text-amber-300",
    info:
      "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
  };

  return (
    <div
      role="alert"
      className={`flex items-center justify-between rounded-lg border px-4 py-3 text-xs font-medium transition-all duration-200 animate-in fade-in slide-in-from-top-1 ${styles[type]} ${className}`}
    >
      <span className="truncate pr-2">{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          type="button"
          aria-label="Dismiss alert"
          className="text-zinc-400 hover:text-white transition-colors duration-150 p-1"
        >
          ✕
        </button>
      )}
    </div>
  );
};

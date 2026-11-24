import React from "react";

export type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

export interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  dot = false,
  children,
  className = "",
}) => {
  const variantStyles: Record<BadgeVariant, { badge: string; dot: string }> = {
    default: {
      badge: "border-zinc-700 bg-zinc-800/60 text-zinc-300",
      dot: "bg-zinc-400",
    },
    success: {
      badge: "border-emerald-500/30 bg-emerald-500/10 text-emerald-300",
      dot: "bg-emerald-400",
    },
    warning: {
      badge: "border-amber-500/30 bg-amber-500/10 text-amber-300",
      dot: "bg-amber-400",
    },
    danger: {
      badge: "border-rose-500/30 bg-rose-500/10 text-rose-300",
      dot: "bg-rose-400",
    },
    info: {
      badge: "border-cyan-500/30 bg-cyan-500/10 text-cyan-300",
      dot: "bg-cyan-400",
    },
  };

  const current = variantStyles[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-tight ${current.badge} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${current.dot}`} />}
      {children}
    </span>
  );
};

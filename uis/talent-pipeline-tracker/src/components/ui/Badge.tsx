/* ═══════════════════════════════════════════════
   HealthCore — UI Badge Component
   ═══════════════════════════════════════════════ */

import type { ReactNode } from "react";

type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info";

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: "bg-surface-muted text-text-secondary border border-border",
  primary: "bg-primary-100 text-primary-800",
  success: "bg-green-100 text-success",
  warning: "bg-amber-100 text-warning",
  error: "bg-red-100 text-error",
  info: "bg-blue-100 text-brand-800",
};

function Badge({ variant = "default", children, className = "" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

export { Badge, type BadgeProps, type BadgeVariant };
/**
 * Shared UI component types for HealthCore frontends (Backoffice, Talent Pipeline).
 *
 * These types serve as the single source of truth for reusable UI components.
 * Import them in your frontend app's components to ensure consistency.
 */

// ═══════════════════════════════════════════════
// Badge
// ═══════════════════════════════════════════════

export type BadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

// ═══════════════════════════════════════════════
// Button
// ═══════════════════════════════════════════════

export type ButtonVariant = "primary" | "secondary" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

// ═══════════════════════════════════════════════
// Card
// ═══════════════════════════════════════════════

export type CardPadding = "none" | "sm" | "md" | "lg";

export interface CardProps {
  padding?: CardPadding;
  className?: string;
  children?: React.ReactNode;
}

// ═══════════════════════════════════════════════
// Pagination
// ═══════════════════════════════════════════════

export interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  onPageChange: (page: number) => void;
}

// ═══════════════════════════════════════════════
// Input / Select
// ═══════════════════════════════════════════════

export interface InputProps {
  type?: "text" | "search" | "email" | "tel" | "url" | "password";
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}

// ═══════════════════════════════════════════════
// Loading / Error / Empty states
// ═══════════════════════════════════════════════

export interface LoadingSkeletonProps {
  count?: number;
}

export interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
}

export interface EmptyStateProps {
  title: string;
  description?: string;
}
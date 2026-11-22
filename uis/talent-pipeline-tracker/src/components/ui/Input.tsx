/* ═══════════════════════════════════════════════
   HealthCore — UI Input Component
   ═══════════════════════════════════════════════ */

import { type InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, id, className = "", ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded-lg border bg-surface px-3 py-2.5 text-base text-text-primary placeholder:text-text-secondary/60 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-primary-700 focus:border-primary-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-11 ${
            error
              ? "border-error focus:ring-error focus:border-error"
              : "border-border"
          } ${className}`}
          aria-invalid={error ? "true" : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="text-sm text-error"
            role="alert"
          >
            {error}
          </p>
        )}
        {helperText && !error && (
          <p className="text-sm text-text-secondary">{helperText}</p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, type InputProps };
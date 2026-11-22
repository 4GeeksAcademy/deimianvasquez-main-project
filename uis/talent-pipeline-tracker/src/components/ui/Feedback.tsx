/* ═══════════════════════════════════════════════
   HealthCore — UI Loading / Error Components
   ═══════════════════════════════════════════════ */

function LoadingSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-xl border border-border bg-surface p-6"
        >
          <div className="mb-3 h-5 w-3/4 rounded bg-surface-muted" />
          <div className="mb-4 h-4 w-1/2 rounded bg-surface-muted" />
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full bg-surface-muted" />
            <div className="h-6 w-20 rounded-full bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ErrorMessage({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div
      className="flex flex-col items-center gap-4 rounded-xl border border-error/30 bg-red-50 p-8 text-center"
      role="alert"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-error/10">
        <span className="text-2xl text-error">!</span>
      </div>
      <p className="text-sm text-error">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-lg bg-error px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-error/90 focus:outline-none focus:ring-2 focus:ring-error focus:ring-offset-2"
        >
          Try again
        </button>
      )}
    </div>
  );
}

function EmptyState({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border p-12 text-center">
      <p className="text-lg font-medium text-text-primary">{title}</p>
      {description && (
        <p className="text-sm text-text-secondary">{description}</p>
      )}
    </div>
  );
}

export { EmptyState, ErrorMessage, LoadingSkeleton };
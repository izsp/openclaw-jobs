/**
 * Minimal task status indicator shown between messages and input.
 * Only renders when there's an active/terminal task status to display.
 * Balance is shown in the header, not duplicated here.
 */

interface TaskStatusBarProps {
  taskStatus: string | null;
  priceCents: number | null;
  onCancel?: () => void;
  onRetry?: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Queued", color: "text-status-pending" },
  assigned: { label: "Working", color: "text-status-active" },
  completed: { label: "Done", color: "text-status-success" },
  failed: { label: "Failed", color: "text-status-error" },
  expired: { label: "Expired", color: "text-content-tertiary" },
  credited: { label: "Credited", color: "text-status-success" },
};

const CANCELLABLE = new Set(["pending", "assigned"]);
const RETRYABLE = new Set(["failed", "expired"]);

export function TaskStatusBar({
  taskStatus,
  priceCents,
  onCancel,
  onRetry,
}: TaskStatusBarProps) {
  if (!taskStatus) return null;

  const statusInfo = STATUS_LABELS[taskStatus];
  if (!statusInfo) return null;

  const canCancel = CANCELLABLE.has(taskStatus);
  const canRetry = RETRYABLE.has(taskStatus);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-content-tertiary md:px-4">
      <span className={statusInfo.color}>
        {taskStatus === "assigned" && <span className="mr-0.5 animate-pulse">●</span>}
        {statusInfo.label}
      </span>
      {priceCents !== null && (
        <span>{priceCents} shrimp</span>
      )}
      {canCancel && onCancel && (
        <button
          onClick={onCancel}
          className="rounded px-1.5 py-0.5 text-content-tertiary transition-colors hover:text-status-error"
        >
          Cancel
        </button>
      )}
      {canRetry && onRetry && (
        <button
          onClick={onRetry}
          className="rounded px-1.5 py-0.5 text-content-tertiary transition-colors hover:text-content-secondary"
        >
          Retry
        </button>
      )}
    </div>
  );
}

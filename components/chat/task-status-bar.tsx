/**
 * Displays the current task status, price, and action buttons in the chat panel.
 */

interface TaskStatusBarProps {
  taskStatus: string | null;
  priceCents: number | null;
  balanceCents: number | null;
  onCancel?: () => void;
  onRetry?: () => void;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Queued", color: "text-status-pending" },
  assigned: { label: "Lobster working...", color: "text-status-active" },
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
  balanceCents,
  onCancel,
  onRetry,
}: TaskStatusBarProps) {
  const statusInfo = taskStatus ? STATUS_LABELS[taskStatus] : null;
  const canCancel = taskStatus !== null && CANCELLABLE.has(taskStatus);
  const canRetry = taskStatus !== null && RETRYABLE.has(taskStatus);

  return (
    <div className="flex flex-wrap items-center justify-between gap-y-1 border-t border-edge px-2 py-1.5 text-xs text-content-tertiary md:px-4 md:py-2">
      <div className="flex items-center gap-2 md:gap-3">
        {statusInfo && (
          <span className={statusInfo.color}>
            {taskStatus === "assigned" && <span className="mr-1 animate-pulse">●</span>}
            {statusInfo.label}
          </span>
        )}
        {priceCents !== null && (
          <span>
            Cost: <span className="text-content-secondary">{priceCents} 🦐</span>
          </span>
        )}
        {canCancel && onCancel && (
          <button
            onClick={onCancel}
            className="rounded border border-edge px-2 py-0.5 text-content-tertiary transition-colors hover:border-status-error hover:text-status-error"
          >
            Cancel
          </button>
        )}
        {canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="rounded border border-edge px-2 py-0.5 text-content-tertiary transition-colors hover:border-edge-strong hover:text-content-secondary"
          >
            Retry
          </button>
        )}
      </div>
      {balanceCents !== null && (
        <span>
          Balance: <span className="text-content-secondary">{balanceCents} 🦐</span>
        </span>
      )}
    </div>
  );
}

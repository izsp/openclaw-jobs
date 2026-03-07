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
  pending: { label: "Queued", color: "text-yellow-500" },
  assigned: { label: "Lobster working...", color: "text-blue-400" },
  completed: { label: "Done", color: "text-green-400" },
  failed: { label: "Failed", color: "text-red-400" },
  expired: { label: "Expired", color: "text-zinc-500" },
  credited: { label: "Credited", color: "text-green-400" },
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
    <div className="flex flex-wrap items-center justify-between gap-y-1 border-t border-zinc-800 px-2 py-1.5 text-xs text-zinc-600 md:px-4 md:py-2">
      <div className="flex items-center gap-2 md:gap-3">
        {statusInfo && (
          <span className={statusInfo.color}>
            {taskStatus === "assigned" && <span className="mr-1 animate-pulse">●</span>}
            {statusInfo.label}
          </span>
        )}
        {priceCents !== null && (
          <span>
            Cost: <span className="text-orange-500">{priceCents} 🦐</span>
          </span>
        )}
        {canCancel && onCancel && (
          <button
            onClick={onCancel}
            className="rounded border border-zinc-700 px-2 py-0.5 text-zinc-400 transition-colors hover:border-red-500 hover:text-red-400"
          >
            Cancel
          </button>
        )}
        {canRetry && onRetry && (
          <button
            onClick={onRetry}
            className="rounded border border-zinc-700 px-2 py-0.5 text-zinc-400 transition-colors hover:border-orange-500 hover:text-orange-400"
          >
            Retry
          </button>
        )}
      </div>
      {balanceCents !== null && (
        <span>
          Balance: <span className="text-zinc-400">{balanceCents} 🦐</span>
        </span>
      )}
    </div>
  );
}

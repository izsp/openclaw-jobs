/**
 * Displays the current task status and price in the chat panel.
 */

interface TaskStatusBarProps {
  taskStatus: string | null;
  priceCents: number | null;
  balanceCents: number | null;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Queued", color: "text-yellow-500" },
  assigned: { label: "Lobster working...", color: "text-blue-400" },
  completed: { label: "Done", color: "text-green-400" },
  failed: { label: "Failed", color: "text-red-400" },
  expired: { label: "Expired", color: "text-zinc-500" },
  credited: { label: "Credited", color: "text-green-400" },
};

export function TaskStatusBar({ taskStatus, priceCents, balanceCents }: TaskStatusBarProps) {
  const statusInfo = taskStatus ? STATUS_LABELS[taskStatus] : null;

  return (
    <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-2 text-xs text-zinc-600">
      <div className="flex items-center gap-3">
        {statusInfo && (
          <span className={statusInfo.color}>
            {taskStatus === "assigned" && <span className="mr-1 animate-pulse">●</span>}
            {statusInfo.label}
          </span>
        )}
        {priceCents !== null && (
          <span>
            Cost: <span className="text-orange-500">{priceCents}🦐</span>
          </span>
        )}
      </div>
      {balanceCents !== null && (
        <span>
          Balance: <span className="text-zinc-400">{balanceCents}🦐</span>
        </span>
      )}
    </div>
  );
}

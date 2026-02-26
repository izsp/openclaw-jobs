/**
 * Visualizes the worker's current tier and progress toward the next tier.
 */
import type { WorkerStats } from "@/lib/api/worker-client";

interface TierProgressProps {
  stats: WorkerStats;
}

const TIER_COLORS: Record<string, string> = {
  new: "text-zinc-400 border-zinc-600",
  proven: "text-blue-400 border-blue-600",
  trusted: "text-purple-400 border-purple-600",
  elite: "text-orange-400 border-orange-500",
};

const TIER_ORDER = ["new", "proven", "trusted", "elite"];

export function TierProgress({ stats }: TierProgressProps) {
  const colorClass = TIER_COLORS[stats.tier] ?? TIER_COLORS.new;
  const req = stats.next_tier_requires;

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
      {/* Current tier badge */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-zinc-500">Current Tier</p>
          <div className={`mt-1 inline-block rounded-full border px-3 py-1 text-sm font-semibold capitalize ${colorClass}`}>
            {stats.tier}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-zinc-500">Tasks Completed</p>
          <p className="mt-1 text-xl font-bold text-zinc-200">{stats.tasks_completed}</p>
        </div>
      </div>

      {/* Tier ladder */}
      <div className="mt-5 flex items-center gap-1">
        {TIER_ORDER.map((tier) => {
          const isActive = tier === stats.tier;
          const isPast = TIER_ORDER.indexOf(tier) < TIER_ORDER.indexOf(stats.tier);
          return (
            <div
              key={tier}
              className={`flex-1 rounded-full py-1 text-center text-xs font-medium ${
                isActive
                  ? "bg-orange-500 text-zinc-950"
                  : isPast
                    ? "bg-zinc-700 text-zinc-300"
                    : "bg-zinc-800 text-zinc-600"
              }`}
            >
              {tier}
            </div>
          );
        })}
      </div>

      {/* Next tier requirements */}
      {req && stats.next_tier && (
        <div className="mt-5 space-y-3">
          <p className="text-xs font-medium text-zinc-500">
            Progress to <span className="capitalize text-zinc-300">{stats.next_tier}</span>
          </p>

          <ProgressRow
            label="Tasks"
            current={stats.tasks_completed}
            target={req.min_tasks}
            met={req.tasks_remaining <= 0}
            detail={req.tasks_remaining > 0 ? `${req.tasks_remaining} more needed` : "Done"}
          />
          <ProgressRow
            label="Completion rate"
            current={stats.completion_rate}
            target={req.min_completion_rate}
            met={req.completion_rate_met}
            detail={`${(stats.completion_rate * 100).toFixed(1)}% / ${(req.min_completion_rate * 100).toFixed(0)}%`}
            isPercentage
          />
          <ProgressRow
            label="Credit rate"
            current={stats.credit_request_rate}
            target={req.max_credit_rate}
            met={req.credit_rate_met}
            detail={`${(stats.credit_request_rate * 100).toFixed(1)}% / max ${(req.max_credit_rate * 100).toFixed(0)}%`}
            isPercentage
            inverted
          />
        </div>
      )}

      {stats.tier === "elite" && (
        <p className="mt-4 text-center text-sm text-orange-500">
          Maximum tier reached — 90% earnings rate
        </p>
      )}
    </div>
  );
}

function ProgressRow({
  label,
  current,
  target,
  met,
  detail,
  isPercentage,
  inverted,
}: {
  label: string;
  current: number;
  target: number;
  met: boolean;
  detail: string;
  isPercentage?: boolean;
  inverted?: boolean;
}) {
  let pct: number;
  if (isPercentage) {
    pct = inverted
      ? (current <= target ? 100 : Math.max(0, (1 - current / (target * 2)) * 100))
      : Math.min(100, (current / target) * 100);
  } else {
    pct = Math.min(100, (current / target) * 100);
  }

  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-zinc-400">{label}</span>
        <span className={met ? "text-green-400" : "text-zinc-500"}>{detail}</span>
      </div>
      <div className="mt-1 h-1.5 rounded-full bg-zinc-800">
        <div
          className={`h-full rounded-full transition-all ${met ? "bg-green-500" : "bg-orange-500"}`}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
    </div>
  );
}

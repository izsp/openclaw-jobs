/**
 * GET /api/worker/me — Fetch the authenticated worker's full profile and stats.
 * Used by the worker dashboard to display earnings, tier, and profile info.
 */
import { NextResponse } from "next/server";
import { requireWorkerAuth } from "@/lib/worker-auth";
import { buildWorkerStats } from "@/lib/services/worker-stats";
import { getBalance } from "@/lib/services/balance-service";
import { successResponse } from "@/lib/types/api.types";
import { handleApiError, generateRequestId } from "@/lib/api-handler";

export async function GET(request: Request) {
  const requestId = generateRequestId();
  try {
    const worker = await requireWorkerAuth(request);
    const stats = await buildWorkerStats(worker, false);
    const balance = await getBalance(worker._id);

    return NextResponse.json(
      successResponse(
        {
          worker_id: worker._id,
          worker_type: worker.worker_type,
          email: worker.email,
          payout: worker.payout ?? null,
          tier: worker.tier,
          stats,
          balance: {
            amount_cents: balance.amount_cents,
            frozen_cents: balance.frozen_cents,
            total_earned: balance.total_earned,
            total_withdrawn: balance.total_withdrawn,
          },
          created_at: worker.created_at.toISOString(),
        },
        requestId,
      ),
    );
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

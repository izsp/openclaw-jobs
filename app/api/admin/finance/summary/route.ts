/**
 * GET /api/admin/finance/summary — Financial summary for a date range.
 */
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { handleApiError, jsonResponse } from "@/lib/api-handler";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { dateRangeSchema } from "@/lib/validators/admin.validator";
import { getFinanceSummary } from "@/lib/services/admin-finance-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);

    const { searchParams } = new URL(request.url);
    const params = {
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    };

    const parsed = dateRangeSchema.safeParse(params);
    if (!parsed.success) {
      return jsonResponse(
        errorResponse(parsed.error.issues[0].message, "VALIDATION_ERROR", requestId),
        { status: 400 },
      );
    }

    // Default to last 30 days if no range provided
    const now = new Date();
    const from = parsed.data.from ?? new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const to = parsed.data.to ?? now;

    const summary = await getFinanceSummary(from, to);
    return jsonResponse(successResponse(summary, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

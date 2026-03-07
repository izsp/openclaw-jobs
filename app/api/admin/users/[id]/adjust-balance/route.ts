/**
 * POST /api/admin/users/[id]/adjust-balance — Adjust user balance (credit or debit).
 */
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { handleApiError, jsonResponse } from "@/lib/api-handler";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { balanceAdjustSchema } from "@/lib/validators/admin.validator";
import { readJsonBody } from "@/lib/validate-payload";
import { PAYLOAD_LIMITS } from "@/lib/constants";
import { adjustBalance } from "@/lib/services/admin-user-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);
    const { id } = await context.params;

    const body = await readJsonBody(request, PAYLOAD_LIMITS.ADMIN_BODY);
    const parsed = balanceAdjustSchema.safeParse(body);
    if (!parsed.success) {
      return jsonResponse(
        errorResponse(parsed.error.issues[0].message, "VALIDATION_ERROR", requestId),
        { status: 400 },
      );
    }

    const newBalance = await adjustBalance(id, parsed.data.amount_cents, parsed.data.reason, "admin");
    return jsonResponse(successResponse({ balance_cents: newBalance }, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

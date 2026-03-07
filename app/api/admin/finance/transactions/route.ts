/**
 * GET /api/admin/finance/transactions — List all transactions with filters.
 */
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { handleApiError, jsonResponse } from "@/lib/api-handler";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { financeTransactionSchema } from "@/lib/validators/admin.validator";
import { listAllTransactions } from "@/lib/services/admin-finance-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);

    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      type: searchParams.get("type") ?? undefined,
      from: searchParams.get("from") ?? undefined,
      to: searchParams.get("to") ?? undefined,
    };

    const parsed = financeTransactionSchema.safeParse(params);
    if (!parsed.success) {
      return jsonResponse(
        errorResponse(parsed.error.issues[0].message, "VALIDATION_ERROR", requestId),
        { status: 400 },
      );
    }

    const result = await listAllTransactions(parsed.data);
    return jsonResponse(successResponse(result, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

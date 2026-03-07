/**
 * GET /api/admin/users/[id]/transactions — List transactions for a specific user.
 */
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { handleApiError, jsonResponse } from "@/lib/api-handler";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { paginationSchema } from "@/lib/validators/admin.validator";
import { listAllTransactions } from "@/lib/services/admin-finance-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);
    const { id } = await context.params;

    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
    };

    const parsed = paginationSchema.safeParse(params);
    if (!parsed.success) {
      return jsonResponse(
        errorResponse(parsed.error.issues[0].message, "VALIDATION_ERROR", requestId),
        { status: 400 },
      );
    }

    const result = await listAllTransactions({ ...parsed.data, user_id: id });
    return jsonResponse(successResponse(result, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

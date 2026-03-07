/**
 * GET /api/admin/users/[id] — Get user details with balance.
 */
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { handleApiError, jsonResponse } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { getUserWithBalance } from "@/lib/services/admin-user-service";

export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);
    const { id } = await context.params;
    const result = await getUserWithBalance(id);
    const { balance, ...user } = result;
    return jsonResponse(successResponse({ user, balance }, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

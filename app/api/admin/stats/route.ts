/**
 * GET /api/admin/stats — Dashboard overview statistics.
 */
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { handleApiError, jsonResponse } from "@/lib/api-handler";
import { successResponse } from "@/lib/types/api.types";
import { getDashboardStats } from "@/lib/services/admin-stats-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);
    const stats = await getDashboardStats();
    return jsonResponse(successResponse(stats, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

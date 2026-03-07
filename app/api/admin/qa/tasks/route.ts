/**
 * GET /api/admin/qa/tasks — List QA tasks with type and verdict filters.
 */
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { handleApiError, jsonResponse } from "@/lib/api-handler";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { qaTaskListSchema } from "@/lib/validators/admin.validator";
import { listQaTasks } from "@/lib/services/admin-task-service";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);

    const { searchParams } = new URL(request.url);
    const params = {
      page: searchParams.get("page") ?? undefined,
      limit: searchParams.get("limit") ?? undefined,
      qa_type: searchParams.get("qa_type") ?? undefined,
      verdict: searchParams.get("verdict") ?? undefined,
    };

    const parsed = qaTaskListSchema.safeParse(params);
    if (!parsed.success) {
      return jsonResponse(
        errorResponse(parsed.error.issues[0].message, "VALIDATION_ERROR", requestId),
        { status: 400 },
      );
    }

    const result = await listQaTasks(parsed.data);
    return jsonResponse(successResponse(result, requestId));
  } catch (error) {
    return handleApiError(error, requestId);
  }
}

/**
 * Admin config API — GET and PUT a platform config document by key.
 *
 * GET  /api/admin/config/[key] — Read config
 * PUT  /api/admin/config/[key] — Update config (partial merge)
 *
 * Both require Bearer token matching ADMIN_SECRET.
 */
import { NextResponse } from "next/server";
import { getConfig, updateConfig } from "@/lib/config";
import { verifyAdminAuth } from "@/lib/admin-auth";
import { generateRequestId } from "@/lib/request-id";
import { configKeySchema, configUpdateSchema } from "@/lib/validators/config.validator";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { AppError } from "@/lib/errors";
import type { ConfigKey } from "@/lib/types";

type RouteContext = { params: Promise<{ key: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);

    const { key } = await context.params;
    const parsed = configKeySchema.safeParse(key);
    if (!parsed.success) {
      return NextResponse.json(
        errorResponse("Invalid config key", "VALIDATION_ERROR", requestId),
        { status: 400 },
      );
    }

    const config = await getConfig(parsed.data);
    if (!config) {
      return NextResponse.json(
        errorResponse("Config not found", "NOT_FOUND", requestId),
        { status: 404 },
      );
    }

    return NextResponse.json(successResponse(config, requestId));
  } catch (error) {
    return handleError(error, requestId);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const requestId = generateRequestId();
  try {
    verifyAdminAuth(request);

    const { key } = await context.params;
    const parsedKey = configKeySchema.safeParse(key);
    if (!parsedKey.success) {
      return NextResponse.json(
        errorResponse("Invalid config key", "VALIDATION_ERROR", requestId),
        { status: 400 },
      );
    }

    const body: unknown = await request.json();
    const parsedBody = configUpdateSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json(
        errorResponse(parsedBody.error.message, "VALIDATION_ERROR", requestId),
        { status: 400 },
      );
    }

    const updated = await updateConfig(
      parsedKey.data as ConfigKey,
      parsedBody.data as Partial<Record<string, unknown>>,
    );

    if (!updated) {
      return NextResponse.json(
        errorResponse("Config not found", "NOT_FOUND", requestId),
        { status: 404 },
      );
    }

    const fresh = await getConfig(parsedKey.data);
    return NextResponse.json(successResponse(fresh, requestId));
  } catch (error) {
    return handleError(error, requestId);
  }
}

function handleError(error: unknown, requestId: string) {
  if (error instanceof AppError) {
    return NextResponse.json(
      errorResponse(error.message, error.code, requestId),
      { status: error.statusCode },
    );
  }
  console.error(`[${requestId}] Unexpected error:`, error);
  return NextResponse.json(
    errorResponse("Internal server error", "INTERNAL_ERROR", requestId),
    { status: 500 },
  );
}

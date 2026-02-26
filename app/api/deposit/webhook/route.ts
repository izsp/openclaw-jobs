/**
 * POST /api/deposit/webhook — Stripe webhook handler.
 * Verifies signature and processes checkout.session.completed events.
 */
import { NextResponse } from "next/server";
import {
  verifyWebhookSignature,
  handleCheckoutComplete,
} from "@/lib/services/deposit-service";
import { successResponse, errorResponse } from "@/lib/types/api.types";
import { generateRequestId } from "@/lib/request-id";
import { AppError } from "@/lib/errors";

export async function POST(request: Request) {
  const requestId = generateRequestId();
  try {
    const payload = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        errorResponse("Missing stripe-signature header", "VALIDATION_ERROR", requestId),
        { status: 400 },
      );
    }

    const event = verifyWebhookSignature(payload, signature);

    if (event.type === "checkout.session.completed") {
      const balanceAfter = await handleCheckoutComplete(event);
      return NextResponse.json(
        successResponse({ balance_after_cents: balanceAfter }, requestId),
      );
    }

    // Acknowledge other event types without processing
    return NextResponse.json(
      successResponse({ received: true }, requestId),
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        errorResponse(error.message, error.code, requestId),
        { status: error.statusCode },
      );
    }
    console.error(`[${requestId}] Webhook error:`, error);
    return NextResponse.json(
      errorResponse("Webhook processing failed", "INTERNAL_ERROR", requestId),
      { status: 500 },
    );
  }
}

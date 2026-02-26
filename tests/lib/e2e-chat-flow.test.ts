/**
 * E2E test simulating the full buyer chat flow:
 *   1. Buyer sends a message → task is created via POST /api/task
 *   2. Task is polled via GET /api/task/[id] (pending → assigned → completed)
 *   3. Result appears as assistant message in the conversation
 *   4. Conversation is persisted to localStorage and can be reloaded
 *   5. Balance is updated after task creation
 *
 * This test wires together all frontend modules (API clients, chat storage,
 * and hooks logic) using mocked fetch to simulate the backend.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { submitTask, getTaskStatus, creditTask } from "@/lib/api/task-client";
import { getBalance } from "@/lib/api/balance-client";
import { createCheckout } from "@/lib/api/deposit-client";
import {
  loadConversations,
  upsertConversation,
  listConversations,
  deleteConversation,
  clearAllConversations,
} from "@/lib/chat/chat-storage";
import type { ChatConversation, ChatMessage } from "@/lib/chat/chat-types";

// ── Mock fetch to simulate backend responses ──

const mockFetch = vi.fn();

beforeEach(() => {
  vi.stubGlobal("fetch", mockFetch);
  mockFetch.mockReset();

  // Mock localStorage
  const store = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
});

function apiResponse<T>(data: T, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve({ success: true, data }),
    headers: new Headers(),
  } as unknown as Response;
}

function apiError(error: string, code: string, status: number): Response {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({ success: false, error, code }),
    headers: new Headers(),
  } as unknown as Response;
}

const USER_ID = "user_buyer_1";

describe("E2E: buyer chat flow", () => {
  it("should submit a task, poll until completed, and get the result", async () => {
    // Step 1: Buyer submits a task via chat
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        task_id: "task_abc123",
        price_cents: 20,
        balance_after_cents: 480,
        deadline: "2026-03-01T00:00:00.000Z",
      }, 201),
    );

    const taskResult = await submitTask({
      type: "chat",
      input: "user: Explain quantum computing in simple terms",
      input_preview: "Explain quantum computing in simple terms",
    });

    expect(taskResult.task_id).toBe("task_abc123");
    expect(taskResult.price_cents).toBe(20);
    expect(taskResult.balance_after_cents).toBe(480);

    // Verify the request was correct
    expect(mockFetch).toHaveBeenCalledWith("/api/task", expect.objectContaining({
      method: "POST",
      body: expect.stringContaining("quantum computing"),
    }));

    // Step 2: Poll — first check returns "pending"
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        task_id: "task_abc123",
        status: "pending",
        type: "chat",
        price_cents: 20,
        output: null,
        completed_at: null,
        created_at: "2026-02-26T12:00:00.000Z",
      }),
    );

    const poll1 = await getTaskStatus("task_abc123");
    expect(poll1.status).toBe("pending");
    expect(poll1.output).toBeNull();

    // Step 3: Poll — second check returns "assigned" (a worker picked it up)
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        task_id: "task_abc123",
        status: "assigned",
        type: "chat",
        price_cents: 20,
        output: null,
        completed_at: null,
        created_at: "2026-02-26T12:00:00.000Z",
      }),
    );

    const poll2 = await getTaskStatus("task_abc123");
    expect(poll2.status).toBe("assigned");

    // Step 4: Poll — third check returns "completed" with the result
    const workerResult = "Quantum computing uses qubits instead of classical bits...";
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        task_id: "task_abc123",
        status: "completed",
        type: "chat",
        price_cents: 20,
        output: workerResult,
        completed_at: "2026-02-26T12:01:00.000Z",
        created_at: "2026-02-26T12:00:00.000Z",
      }),
    );

    const poll3 = await getTaskStatus("task_abc123");
    expect(poll3.status).toBe("completed");
    expect(poll3.output).toBe(workerResult);

    // Step 5: Build conversation and persist to localStorage
    const conversation: ChatConversation = {
      id: "conv_1",
      task_id: "task_abc123",
      task_status: "completed",
      price_cents: 20,
      messages: [
        { id: "m1", role: "user", content: "Explain quantum computing in simple terms", timestamp: Date.now() - 1000 },
        { id: "m2", role: "assistant", content: workerResult, timestamp: Date.now() },
      ],
      created_at: Date.now() - 1000,
      updated_at: Date.now(),
    };

    upsertConversation(USER_ID, conversation);

    // Step 6: Verify it can be reloaded from storage
    const reloaded = loadConversations(USER_ID);
    expect(reloaded).toHaveLength(1);
    expect(reloaded[0].task_id).toBe("task_abc123");
    expect(reloaded[0].messages).toHaveLength(2);
    expect(reloaded[0].messages[1].content).toBe(workerResult);

    // Step 7: Verify the conversation summary
    const summaries = listConversations(USER_ID);
    expect(summaries[0].preview).toBe("Explain quantum computing in simple terms");
    expect(summaries[0].task_status).toBe("completed");
  });

  it("should handle task credit after completion", async () => {
    mockFetch.mockResolvedValueOnce(
      apiResponse({ balance_after_cents: 500 }),
    );

    const result = await creditTask("task_abc123");
    expect(result.balance_after_cents).toBe(500);

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/task/task_abc123/credit",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("should handle insufficient balance error gracefully", async () => {
    mockFetch.mockResolvedValueOnce(
      apiError("Insufficient balance", "BALANCE_ERROR", 400),
    );

    await expect(
      submitTask({ type: "chat", input: "expensive task" }),
    ).rejects.toThrow("Insufficient balance");
  });

  it("should fetch and display balance correctly", async () => {
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        amount_cents: 480,
        frozen_cents: 0,
        total_deposited: 500,
        total_earned: 0,
        total_withdrawn: 0,
      }),
    );

    const balance = await getBalance();
    expect(balance.amount_cents).toBe(480);
    expect(balance.total_deposited).toBe(500);
  });

  it("should create a Stripe checkout session for deposits", async () => {
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        session_id: "cs_test_abc",
        url: "https://checkout.stripe.com/pay/cs_test_abc",
      }),
    );

    const checkout = await createCheckout(1000);
    expect(checkout.session_id).toBe("cs_test_abc");
    expect(checkout.url).toContain("stripe.com");

    expect(mockFetch).toHaveBeenCalledWith("/api/deposit", expect.objectContaining({
      method: "POST",
      body: '{"amount_cents":1000}',
    }));
  });

  it("should simulate multi-turn conversation with task per message", async () => {
    const messages: ChatMessage[] = [];

    // Turn 1: User sends first message
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        task_id: "task_turn1",
        price_cents: 5,
        balance_after_cents: 495,
        deadline: "2026-03-01T00:00:00.000Z",
      }, 201),
    );

    const turn1 = await submitTask({
      type: "chat",
      input: "user: What is Rust?",
      input_preview: "What is Rust?",
    });
    messages.push({ id: "m1", role: "user", content: "What is Rust?", timestamp: 1 });

    // Worker completes turn 1
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        task_id: "task_turn1",
        status: "completed",
        type: "chat",
        price_cents: 5,
        output: "Rust is a systems programming language...",
        completed_at: "2026-02-26T12:01:00.000Z",
        created_at: "2026-02-26T12:00:00.000Z",
      }),
    );

    const result1 = await getTaskStatus(turn1.task_id);
    messages.push({ id: "m2", role: "assistant", content: result1.output!, timestamp: 2 });

    // Turn 2: User follows up — input includes full history
    mockFetch.mockResolvedValueOnce(
      apiResponse({
        task_id: "task_turn2",
        price_cents: 10,
        balance_after_cents: 485,
        deadline: "2026-03-01T00:00:00.000Z",
      }, 201),
    );

    const fullContext = messages.map((m) => `${m.role}: ${m.content}`).join("\n")
      + "\nuser: How does its ownership model work?";

    const turn2 = await submitTask({
      type: "chat",
      input: fullContext,
      input_preview: "How does its ownership model work?",
    });
    messages.push({ id: "m3", role: "user", content: "How does its ownership model work?", timestamp: 3 });

    expect(turn2.task_id).toBe("task_turn2");
    expect(turn2.price_cents).toBe(10); // Higher price for multi-turn

    // Verify multi-turn context was sent to the backend
    const lastCall = mockFetch.mock.calls[mockFetch.mock.calls.length - 1];
    const body = JSON.parse(lastCall[1].body);
    expect(body.input).toContain("What is Rust?");
    expect(body.input).toContain("Rust is a systems programming language");
    expect(body.input).toContain("How does its ownership model work?");
  });

  it("should persist and reload multi-conversation history", () => {
    const conv1 = createTestConversation("conv_1", "task_1", "Code review request");
    const conv2 = createTestConversation("conv_2", "task_2", "Translate this document");
    const conv3 = createTestConversation("conv_3", "task_3", "Research quantum computing");

    upsertConversation(USER_ID, conv1);
    upsertConversation(USER_ID, conv2);
    upsertConversation(USER_ID, conv3);

    const summaries = listConversations(USER_ID);
    expect(summaries).toHaveLength(3);
    // Most recently added should be first
    expect(summaries[0].preview).toBe("Research quantum computing");

    // Delete middle one
    deleteConversation(USER_ID, "conv_2");
    expect(listConversations(USER_ID)).toHaveLength(2);

    // Clear all
    clearAllConversations(USER_ID);
    expect(listConversations(USER_ID)).toHaveLength(0);
  });
});

function createTestConversation(
  id: string,
  taskId: string,
  userMessage: string,
): ChatConversation {
  return {
    id,
    task_id: taskId,
    task_status: "completed",
    price_cents: 20,
    messages: [
      { id: `${id}_m1`, role: "user", content: userMessage, timestamp: Date.now() },
    ],
    created_at: Date.now(),
    updated_at: Date.now(),
  };
}

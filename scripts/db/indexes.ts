/**
 * MongoDB index definitions for all collections.
 * Each entry maps a collection name to its required indexes.
 */
import type { CreateIndexesOptions, IndexSpecification } from "mongodb";

export interface IndexDefinition {
  key: IndexSpecification;
  options?: CreateIndexesOptions;
}

export const COLLECTION_INDEXES: Record<string, IndexDefinition[]> = {
  user: [
    {
      key: { email: 1 },
      options: {
        unique: true,
        partialFilterExpression: { email: { $type: "string" } },
        name: "user_email_unique",
      },
    },
    {
      key: { auth_provider: 1, auth_id: 1 },
      options: { unique: true, name: "user_auth_unique" },
    },
  ],

  transaction: [
    {
      key: { user_id: 1, created_at: -1 },
      options: { name: "tx_user_recent" },
    },
  ],

  task: [
    {
      // Queue query: find pending tasks ordered by creation time
      key: { status: 1, created_at: 1 },
      options: {
        partialFilterExpression: { status: "pending" },
        name: "task_pending_queue",
      },
    },
    {
      // Timeout recovery: find assigned tasks past deadline
      key: { status: 1, deadline: 1 },
      options: {
        partialFilterExpression: { status: "assigned" },
        name: "task_assigned_deadline",
      },
    },
    {
      // Buyer's task lookup
      key: { buyer_id: 1, created_at: -1 },
      options: { name: "task_buyer_recent" },
    },
    {
      // QA result queries
      key: { "_internal.is_qa": 1, "_internal.qa_result.verdict": 1 },
      options: {
        partialFilterExpression: { "_internal.is_qa": true },
        name: "task_qa_results",
      },
    },
    {
      // Auto-delete expired task data
      key: { purge_at: 1 },
      options: { expireAfterSeconds: 0, name: "task_purge_ttl" },
    },
  ],

  worker: [
    {
      key: { token_hash: 1 },
      options: { unique: true, name: "worker_token_unique" },
    },
    {
      key: { email: 1 },
      // WHY partialFilterExpression instead of sparse: MongoDB sparse indexes
      // still include documents with email: null (only excludes missing fields).
      // partialFilterExpression with $type: "string" excludes null values entirely,
      // allowing multiple workers to have email: null.
      options: {
        unique: true,
        partialFilterExpression: { email: { $type: "string" } },
        name: "worker_email_unique",
      },
    },
  ],

  audit_log: [
    {
      // Auto-delete after 90 days
      key: { created_at: 1 },
      options: {
        expireAfterSeconds: 90 * 24 * 60 * 60,
        name: "audit_log_ttl_90d",
      },
    },
  ],
};

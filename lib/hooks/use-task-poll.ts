/**
 * React hook that polls a task's status until completion.
 * Stops polling when task reaches a terminal state.
 */
"use client";

import { useSyncExternalStore, useRef, useCallback, useEffect } from "react";
import { getTaskStatus, type TaskStatus } from "@/lib/api/task-client";

const POLL_INTERVAL_MS = 2000;
const TERMINAL_STATUSES = new Set(["completed", "failed", "expired", "credited"]);

interface TaskPollState {
  task: TaskStatus | null;
  loading: boolean;
  error: string | null;
}

const EMPTY_STATE: TaskPollState = { task: null, loading: false, error: null };

/**
 * Polls a task's status until it reaches a terminal state.
 * Returns null task when taskId is null.
 */
export function useTaskPoll(taskId: string | null): TaskPollState {
  const stateRef = useRef<TaskPollState>(EMPTY_STATE);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const listenersRef = useRef(new Set<() => void>());

  const subscribe = useCallback((listener: () => void) => {
    listenersRef.current.add(listener);
    return () => { listenersRef.current.delete(listener); };
  }, []);

  const getSnapshot = useCallback(() => stateRef.current, []);

  const notify = useCallback(() => {
    for (const listener of listenersRef.current) listener();
  }, []);

  const update = useCallback((next: Partial<TaskPollState>) => {
    stateRef.current = { ...stateRef.current, ...next };
    notify();
  }, [notify]);

  useEffect(() => {
    if (!taskId) {
      stateRef.current = EMPTY_STATE;
      notify();
      return;
    }

    let cancelled = false;
    update({ loading: true, error: null, task: null });

    async function poll() {
      try {
        const status = await getTaskStatus(taskId!);
        if (cancelled) return;
        update({ task: status, loading: false });
        if (TERMINAL_STATUSES.has(status.status) && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch (err) {
        if (cancelled) return;
        update({ error: err instanceof Error ? err.message : "Poll failed", loading: false });
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }

    void poll();
    intervalRef.current = setInterval(poll, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [taskId, update, notify]);

  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_STATE);
}

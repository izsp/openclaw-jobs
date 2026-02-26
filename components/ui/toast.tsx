/**
 * Lightweight toast notification system.
 * Usage: import { useToast, ToastProvider } and wrap app in <ToastProvider>.
 * Then call toast.success("message") or toast.error("message").
 */
"use client";

import { createContext, useContext, useState, useCallback } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 3000;

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const success = useCallback((msg: string) => addToast("success", msg), [addToast]);
  const error = useCallback((msg: string) => addToast("error", msg), [addToast]);
  const info = useCallback((msg: string) => addToast("info", msg), [addToast]);

  return (
    <ToastContext.Provider value={{ success, error, info }}>
      {children}
      {/* Toast container — fixed bottom-right */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => {
              setToasts((prev) => prev.filter((x) => x.id !== t.id));
            }} />
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

const TYPE_STYLES: Record<ToastType, string> = {
  success: "border-green-800 bg-green-950/90 text-green-300",
  error: "border-red-800 bg-red-950/90 text-red-300",
  info: "border-zinc-700 bg-zinc-900/90 text-zinc-300",
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm animate-toast-in ${TYPE_STYLES[toast.type]}`}
      role="alert"
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={onDismiss}
        className="shrink-0 text-zinc-500 transition-colors hover:text-zinc-300"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}

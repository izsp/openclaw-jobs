"use client";

import { useState } from "react";
import { useAdminAuth } from "@/lib/hooks/use-admin-auth";
import { LoginGate } from "@/components/admin/login-gate";
import { AdminSidebar } from "@/components/admin/sidebar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, login, logout } = useAdminAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <LoginGate onLogin={login} />;
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Top bar with hamburger for mobile */}
      <div className="flex items-center border-b border-zinc-800 md:hidden">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="p-4 text-zinc-400 hover:text-zinc-200"
          aria-label="Toggle sidebar"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-orange-500">Admin</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:block">
          <AdminSidebar onLogout={logout} />
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <aside className="fixed inset-y-0 left-0 z-50 md:hidden">
              <AdminSidebar
                onNavigate={() => setSidebarOpen(false)}
                onLogout={logout}
              />
            </aside>
          </>
        )}

        {/* Content area */}
        <main className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

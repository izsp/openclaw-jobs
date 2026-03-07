"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminSidebarProps {
  onNavigate?: () => void;
  onLogout: () => void;
}

const NAV_ITEMS = [
  { href: "/admin/dashboard", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/workers", label: "Workers" },
  { href: "/admin/tasks", label: "Tasks" },
  { href: "/admin/finance", label: "Finance" },
  { href: "/admin/config", label: "Config" },
  { href: "/admin/qa", label: "QA" },
  { href: "/admin/audit", label: "Audit" },
];

export function AdminSidebar({ onNavigate, onLogout }: AdminSidebarProps) {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/admin/dashboard") {
      return pathname === "/admin" || pathname === "/admin/dashboard";
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-full w-56 flex-col border-r border-zinc-800 bg-zinc-950">
      <div className="border-b border-zinc-800 px-4 py-3">
        <span className="text-sm font-semibold text-orange-500">
          Admin Panel
        </span>
      </div>

      <nav className="flex-1 px-3 py-4">
        <ul className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={`flex items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-zinc-800 text-orange-500"
                      : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                  }`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-zinc-800 p-3">
        <button
          onClick={onLogout}
          className="flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm text-zinc-400 transition-colors hover:bg-zinc-900 hover:text-zinc-200"
        >
          Logout
        </button>
      </div>
    </div>
  );
}

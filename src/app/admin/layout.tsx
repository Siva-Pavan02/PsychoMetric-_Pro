"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // If we are on the login page, don't show the sidebar
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  };

  const navItems = [
    { name: "Overview", href: "/admin" },
    { name: "Participants", href: "/admin/participants" },
    { name: "Payments", href: "/admin/payments" },
    { name: "Reports", href: "/admin/reports" },
    { name: "Evidence / Reset", href: "/admin/evidence" },
  ];

  return (
    <div className="min-h-screen bg-neu-bg flex flex-col md:flex-row">
      {/* Sidebar Desktop / Top Nav Mobile */}
      <aside className="w-full md:w-64 bg-neu-bg shadow-neu-flat border-r-4 border-neu-bg flex-shrink-0 flex flex-col z-10">
        <div className="p-6">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">PsychoMetric Pro</p>
          <h2 className="text-xl font-black text-[#1e3a5f]">Operations</h2>
        </div>
        <nav className="flex-1 px-4 pb-4 md:pb-0 flex flex-row md:flex-col gap-3 overflow-x-auto md:overflow-visible">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`px-4 py-3 rounded-xl text-sm font-bold transition-all flex-shrink-0 md:flex-shrink-1 ${
                  isActive
                    ? "bg-neu-bg shadow-neu-pressed text-[var(--color-accent)]"
                    : "text-slate-500 hover:shadow-neu-flat hover:text-[#1e3a5f]"
                }`}
              >
                {item.name}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 mt-auto hidden md:block">
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full text-left px-4 py-3 text-slate-500 hover:text-red-500 hover:shadow-neu-flat rounded-xl text-sm font-bold transition-all"
          >
            {isLoggingOut ? "Signing out..." : "Logout"}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-8 overflow-y-auto max-h-screen">
        <div className="md:hidden flex justify-end mb-4">
          <button
            onClick={handleLogout}
            className="text-xs font-bold text-slate-500 uppercase px-4 py-2 bg-neu-bg shadow-neu-flat rounded-xl transition-all active:shadow-neu-pressed"
          >
            Logout
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}

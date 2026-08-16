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
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Sidebar Desktop / Top Nav Mobile */}
      <aside className="w-full md:w-64 bg-[#1e3a5f] text-white flex-shrink-0 flex flex-col">
        <div className="p-6">
          <p className="text-blue-300 text-xs font-bold uppercase tracking-widest mb-1">PsychoMetric Pro</p>
          <h2 className="text-xl font-black text-white">Operations</h2>
        </div>
        <nav className="flex-1 px-4 pb-4 md:pb-0 flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors flex-shrink-0 md:flex-shrink-1 ${
                  isActive ? "bg-white text-[#1e3a5f]" : "text-blue-100 hover:bg-[#162c4a]"
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
            className="w-full text-left px-4 py-2.5 text-blue-200 hover:text-white text-sm font-semibold transition-colors"
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
            className="text-xs font-bold text-slate-500 uppercase px-3 py-1.5 bg-white border border-slate-200 rounded-md shadow-sm"
          >
            Logout
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}

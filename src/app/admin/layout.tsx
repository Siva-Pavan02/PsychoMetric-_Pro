"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
    { name: "User Input Analysis", href: "/admin/responses" },
    { name: "Evidence / Reset", href: "/admin/evidence" },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(29,79,122,0.08),_transparent_25%),linear-gradient(180deg,#edf3f8_0%,#f8fafc_100%)] text-slate-800">
      <div className="flex min-h-screen flex-col md:flex-row">
        <aside className="z-10 flex w-full shrink-0 flex-col border-b border-slate-200 bg-white/80 backdrop-blur-xl md:w-72 md:border-b-0 md:border-r">
          <div className="px-6 py-6">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">PsychoMetric Pro</p>
            <h2 className="mt-2 text-2xl font-black tracking-[-0.06em] text-[#10233d]">Operations</h2>
          </div>

          <nav className="flex flex-row gap-2 overflow-x-auto px-4 pb-4 md:flex-col md:overflow-visible md:px-4 md:pb-6">
            {navItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex-shrink-0 rounded-2xl px-4 py-3 text-sm font-bold transition-all md:flex-shrink ${
                    isActive
                      ? "bg-[#10233d] text-white shadow-[0_18px_30px_rgba(16,35,61,0.18)]"
                      : "bg-slate-50 text-slate-600 hover:bg-white hover:text-[#10233d]"
                  }`}
                >
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto hidden p-4 md:block">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm font-bold text-slate-600 transition-all hover:border-red-200 hover:text-red-600"
            >
              {isLoggingOut ? "Signing out..." : "Logout"}
            </button>
          </div>
        </aside>

        <main className="flex-1 p-4 md:p-8">
          <div className="mb-4 flex justify-end md:hidden">
            <button
              onClick={handleLogout}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-600"
            >
              Logout
            </button>
          </div>
          {children}
        </main>
      </div>
    </div>
  );
}

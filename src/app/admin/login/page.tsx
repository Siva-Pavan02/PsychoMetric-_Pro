"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (res.ok) {
        router.push("/admin");
        router.refresh();
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(29,79,122,0.08),_transparent_38%),linear-gradient(180deg,#edf3f8_0%,#f8fafc_100%)] px-4 py-10">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-[0_28px_42px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#10233d] text-sm font-black text-white">P</span>
            <span className="text-lg font-black tracking-[-0.05em] text-[#10233d]">PsychoMetric Pro</span>
          </div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Operations console</p>
          <h1 className="mt-3 text-3xl font-black tracking-[-0.08em] text-[#10233d]">Secure access</h1>
        </div>

        {error && (
          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Email</label>
            <input
              type="email"
              required
              className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3.5 text-base text-[#10233d] transition-all duration-200 placeholder:text-slate-400 focus:border-[#1d4f7a] focus:bg-white focus:outline-none focus:shadow-[0_0_0_3px_rgba(29,79,122,0.08)]"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500">Password</label>
            <input
              type="password"
              required
              className="w-full rounded-2xl border border-slate-200 bg-[#f8fafc] px-4 py-3.5 text-base text-[#10233d] transition-all duration-200 placeholder:text-slate-400 focus:border-[#1d4f7a] focus:bg-white focus:outline-none focus:shadow-[0_0_0_3px_rgba(29,79,122,0.08)]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-full bg-[#10233d] px-6 py-4 text-base font-semibold text-white shadow-[0_18px_30px_rgba(16,35,61,0.18)] transition-all duration-200 hover:-translate-y-0.5 hover:bg-[#0d1f35] disabled:opacity-70"
          >
            {loading ? "Authenticating..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}

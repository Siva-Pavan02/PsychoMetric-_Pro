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
    <div className="min-h-screen flex items-center justify-center bg-neu-bg px-4">
      <div className="bg-neu-bg p-10 rounded-3xl shadow-neu-flat border-4 border-neu-bg w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2">PsychoMetric Pro</p>
          <h1 className="text-2xl font-black text-[#1e3a5f]">Operations <span className="text-[var(--color-accent)]">Console</span></h1>
        </div>

        {error && (
          <div className="bg-neu-bg shadow-neu-pressed ring-1 ring-red-400 text-red-600 p-4 rounded-xl text-sm mb-6 font-bold text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Email</label>
            <input
              type="email"
              required
              className="w-full px-5 py-4 bg-neu-bg shadow-neu-pressed border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-5 py-4 bg-neu-bg shadow-neu-pressed border-none rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] text-sm transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neu-bg shadow-neu-flat hover:shadow-neu-pressed text-[#1e3a5f] font-bold py-4 px-4 rounded-xl transition-all disabled:opacity-50 disabled:shadow-neu-flat disabled:cursor-not-allowed mt-2"
          >
            {loading ? "Authenticating..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

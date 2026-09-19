"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * /assessment/resume — "Recover your assessment"
 *
 * Accepts an email address, reconciles all pending payments for that email,
 * and sends recovery links. Always shows the same neutral message to avoid
 * revealing whether an email has paid.
 *
 * Rate-limited server-side via /api/assessment/resume.
 */
export default function ResumePage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/assessment/resume", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email: email.trim().toLowerCase() }),
      });
    } catch {
      // intentionally swallow — always show neutral message
    } finally {
      setLoading(false);
      setSubmitted(true);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f4f7f9] p-4">
      <div className="w-full max-w-md rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50">
        <div className="mb-6">
          <Link href="/" className="mb-6 flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#10233d] text-xs font-black text-white">🌊</span>
            <span className="text-base font-bold tracking-tight text-[#10233d]">PsychoMetric Pro</span>
          </Link>
          <h1 className="mt-4 text-2xl font-black tracking-tight text-[#10233d]">Recover your assessment</h1>
          <p className="mt-2 text-sm text-slate-500">
            If you paid and lost access to your assessment link, enter the email you used to register.
          </p>
        </div>

        {submitted ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-sm font-semibold text-emerald-800">
              If we found an assessment linked to that email address, we&apos;ve sent you a recovery link. Please check your inbox (including spam).
            </p>
            <button
              onClick={() => { setSubmitted(false); setEmail(""); }}
              className="mt-4 text-xs font-bold text-[#10233d] underline"
            >
              Try another email
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                required
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-[#10233d] outline-none focus:border-[#2b7a78] focus:ring-4 focus:ring-[#2b7a78]/10"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full rounded-xl bg-[#10233d] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0d1f35] disabled:opacity-70"
            >
              {loading ? "Sending…" : "Send recovery link"}
            </button>
          </form>
        )}

        <p className="mt-6 text-center text-xs text-slate-400">
          Need more help?{" "}
          <a href="mailto:support@psychometricpro.com" className="font-semibold text-[#10233d] underline">
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}

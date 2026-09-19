"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ReportAccessManagerProps {
  reportId: string;
  hasToken: boolean;
  expiresAt: Date | null;
  revokedAt: Date | null;
  pdfCached: boolean;
}

export function ReportAccessManager({ reportId, hasToken, expiresAt, revokedAt, pdfCached }: ReportAccessManagerProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [newToken, setNewToken] = useState<string | null>(null);

  const isRevoked = !!revokedAt;
  const isExpired = expiresAt && new Date(expiresAt) < new Date();

  const handleRevoke = async () => {
    if (!confirm("Are you sure you want to revoke this report's access? The participant will no longer be able to view it.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/revoke`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to revoke");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async () => {
    if (!confirm("This will issue a new token. Any previous token will become invalid. Continue?")) return;
    setLoading(true);
    setNewToken(null);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/issue-token`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to issue token");
      const data = await res.json();
      setNewToken(data.token);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleExtend = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/extend`, { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 30 })
      });
      if (!res.ok) throw new Error("Failed to extend token");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/resend-email`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to resend email");
      alert("Email queued for resending.");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleRegenPdf = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/regen-pdf`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to regenerate PDF");
      alert("PDF regenerated and cached successfully.");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const handleClearPdf = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/clear-pdf`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to clear PDF cache");
      alert("PDF cache cleared.");
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <h3 className="mb-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Access Management</h3>
      
      <div className="mb-4 space-y-2 text-sm text-slate-600">
        <div className="flex justify-between">
          <span>Token Status:</span>
          {isRevoked ? (
            <span className="font-bold text-red-600">REVOKED</span>
          ) : isExpired ? (
            <span className="font-bold text-amber-600">EXPIRED</span>
          ) : hasToken ? (
            <span className="font-bold text-emerald-600">ACTIVE</span>
          ) : (
            <span className="font-bold text-slate-400">NONE</span>
          )}
        </div>
        {expiresAt && !isRevoked && (
          <div className="flex justify-between">
            <span>Expires:</span>
            <span className="font-medium">{new Date(expiresAt).toLocaleDateString()}</span>
          </div>
        )}
      </div>

      {newToken && (
        <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3">
          <p className="mb-1 text-xs font-bold text-emerald-800">New Token Generated (Save this now!)</p>
          <code className="block break-all rounded bg-white p-2 text-xs font-mono text-emerald-900 shadow-sm">
            {newToken}
          </code>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleResendEmail}
          disabled={loading}
          className="rounded border border-[#2b7a78] bg-white px-3 py-1.5 text-xs font-bold text-[#2b7a78] transition-colors hover:bg-[#e8f4f3] disabled:opacity-50"
        >
          Resend Email
        </button>

        <button
          onClick={handleRegenPdf}
          disabled={loading}
          className="rounded border border-indigo-600 bg-white px-3 py-1.5 text-xs font-bold text-indigo-600 transition-colors hover:bg-indigo-50 disabled:opacity-50"
        >
          Regen PDF
        </button>

        {pdfCached && (
          <button
            onClick={handleClearPdf}
            disabled={loading}
            className="rounded border border-orange-600 bg-white px-3 py-1.5 text-xs font-bold text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50"
          >
            Clear PDF Cache
          </button>
        )}

        {hasToken && !isRevoked && (
          <button
            onClick={handleRevoke}
            disabled={loading}
            className="rounded bg-red-100 px-3 py-1.5 text-xs font-bold text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
          >
            Revoke Access
          </button>
        )}
        
        {hasToken && !isRevoked && (
          <button
            onClick={handleExtend}
            disabled={loading}
            className="rounded bg-slate-200 px-3 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-300 disabled:opacity-50"
          >
            Extend 30 Days
          </button>
        )}

        <button
          onClick={handleIssue}
          disabled={loading}
          className="rounded bg-[#10233d] px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#0d1f35] disabled:opacity-50"
        >
          {hasToken ? "Re-issue Token" : "Issue Token"}
        </button>
      </div>
    </div>
  );
}

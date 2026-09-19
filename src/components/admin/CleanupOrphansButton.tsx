"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CleanupOrphansButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleCleanup = async () => {
    if (!confirm("Are you sure you want to delete orphaned participants older than 7 days? This action cannot be undone.")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/participants/cleanup`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to cleanup");
      const data = await res.json();
      alert(`Cleanup successful. Deleted ${data.deleted} orphaned participants.`);
      router.refresh();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleCleanup}
      disabled={loading}
      className="rounded-full bg-red-100 px-4 py-2 text-xs font-bold text-red-700 transition-colors hover:bg-red-200 disabled:opacity-50"
    >
      {loading ? "Cleaning..." : "Cleanup Orphans"}
    </button>
  );
}

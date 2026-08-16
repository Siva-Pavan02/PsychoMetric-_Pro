"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Counts {
  participants: number;
  assessments: number;
  responses: number;
  payments: number;
  results: number;
  reports: number;
}

const CONFIRMATION_PHRASE = "DELETE ALL TEST DATA";

export default function ResetPanel({
  counts,
  resetEnabled,
}: {
  counts: Counts;
  resetEnabled: boolean;
}) {
  const router = useRouter();
  const [phase, setPhase] = useState<"idle" | "confirm1" | "confirm2" | "executing" | "done" | "error">("idle");
  const [typedPhrase, setTypedPhrase] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [finalCounts, setFinalCounts] = useState<Counts | null>(null);

  const hasData =
    counts.participants > 0 ||
    counts.assessments > 0 ||
    counts.payments > 0 ||
    counts.reports > 0;

  if (!resetEnabled) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-bold text-amber-700">Reset Disabled</p>
        <p className="text-xs text-amber-600 mt-1">
          Set <code className="bg-amber-100 px-1 rounded">ALLOW_DATA_RESET=true</code> in your
          Vercel environment variables and redeploy to enable the reset operation.
        </p>
      </div>
    );
  }

  if (phase === "idle") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-slate-100 bg-slate-50 p-4">
          <p className="text-xs font-bold text-slate-500 uppercase mb-3">Current Record Counts</p>
          <div className="grid grid-cols-3 gap-3 text-sm">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k}>
                <span className="capitalize text-slate-500">{k}</span>
                <span className="ml-2 font-black text-[#1e3a5f]">{v}</span>
              </div>
            ))}
          </div>
        </div>
        {hasData ? (
          <button
            onClick={() => setPhase("confirm1")}
            className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm"
          >
            Begin Reset…
          </button>
        ) : (
          <p className="text-sm text-slate-400 italic">Database is already empty.</p>
        )}
      </div>
    );
  }

  if (phase === "confirm1") {
    const phraseMatch = typedPhrase === CONFIRMATION_PHRASE;
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="font-bold text-red-700 mb-1">⚠ THIS ACTION CANNOT BE UNDONE.</p>
          <p className="text-sm text-red-600">
            This permanently deletes all participant, assessment, response, payment, result, and
            report records from the configured database.
          </p>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
            Type <span className="text-red-600 font-mono">{CONFIRMATION_PHRASE}</span> to confirm
          </label>
          <input
            type="text"
            value={typedPhrase}
            onChange={(e) => setTypedPhrase(e.target.value)}
            placeholder={CONFIRMATION_PHRASE}
            className="w-full border border-slate-200 rounded-lg px-4 py-2.5 font-mono text-sm focus:outline-none focus:border-red-400"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setPhase("idle"); setTypedPhrase(""); }}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            disabled={!phraseMatch}
            onClick={() => setPhase("confirm2")}
            className="px-5 py-2.5 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Continue →
          </button>
        </div>
      </div>
    );
  }

  if (phase === "confirm2") {
    return (
      <div className="space-y-4">
        <div className="rounded-lg border border-red-300 bg-red-50 p-5">
          <p className="font-bold text-red-800 text-base mb-3">Final Confirmation</p>
          <p className="text-sm text-red-700 mb-4">
            You are about to permanently delete all application test data:
          </p>
          <div className="grid grid-cols-3 gap-3 text-sm mb-4">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="capitalize text-red-600">{k}</span>
                <span className="font-black text-red-800">{v}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-red-600 font-bold">
            Schema, migrations, and configuration are preserved.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setPhase("idle"); setTypedPhrase(""); }}
            className="px-5 py-2.5 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg hover:bg-slate-50 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              setPhase("executing");
              setErrorMsg("");
              try {
                const res = await fetch("/api/admin/reset", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ confirmation: CONFIRMATION_PHRASE }),
                });
                const data = await res.json();
                if (!res.ok) {
                  setErrorMsg(data.error ?? "Reset failed.");
                  setPhase("error");
                  return;
                }
                setFinalCounts(data.counts);
                setPhase("done");
                router.refresh();
              } catch {
                setErrorMsg("Network error. Reset may not have completed.");
                setPhase("error");
              }
            }}
            className="px-5 py-2.5 bg-red-700 text-white font-bold rounded-lg hover:bg-red-800 transition-colors text-sm"
          >
            DELETE PERMANENTLY
          </button>
        </div>
      </div>
    );
  }

  if (phase === "executing") {
    return (
      <div className="py-6 text-center text-slate-500">
        <p className="font-bold">Executing reset…</p>
        <p className="text-sm mt-1">Please wait. Do not close this page.</p>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-5 space-y-3">
        <p className="font-bold text-emerald-700">✓ Reset Complete</p>
        <p className="text-sm text-emerald-600">
          All test data has been deleted. Final database counts:
        </p>
        {finalCounts && (
          <div className="grid grid-cols-3 gap-3 text-sm">
            {Object.entries(finalCounts).map(([k, v]) => (
              <div key={k}>
                <span className="capitalize text-emerald-600">{k}</span>
                <span className="ml-2 font-black text-emerald-800">{v as number}</span>
              </div>
            ))}
          </div>
        )}
        <p className="text-xs text-emerald-600 font-bold mt-2">
          Next: Set <code className="bg-emerald-100 px-1 rounded">ALLOW_DATA_RESET=false</code> in
          Vercel and redeploy.
        </p>
      </div>
    );
  }

  // error phase
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
      <p className="font-bold text-red-700">Reset Failed</p>
      <p className="text-sm text-red-600">{errorMsg}</p>
      <button
        onClick={() => { setPhase("idle"); setTypedPhrase(""); setErrorMsg(""); }}
        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 font-bold rounded-lg text-sm hover:bg-slate-50"
      >
        Back
      </button>
    </div>
  );
}

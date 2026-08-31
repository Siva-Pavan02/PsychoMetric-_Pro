"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

interface QuestionItem {
  id: string;
  text: string;
  order: number;
}

const LABELS = ["Strongly Disagree", "Disagree", "Neutral", "Agree", "Strongly Agree"];

export default function QuestionsPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const router = useRouter();

  const [token, setToken] = useState<string>("");
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showReview, setShowReview] = useState(false);
  const [pageError, setPageError] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Pending auto-advance timer. Manual navigation must cancel it, otherwise a
  // stale timer fires after the user has already moved and bounces them forward.
  const advanceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearAdvance = useCallback(() => {
    if (advanceTimer.current !== null) {
      clearTimeout(advanceTimer.current);
      advanceTimer.current = null;
    }
  }, []);

  // Cancel any in-flight auto-advance on unmount.
  useEffect(() => clearAdvance, [clearAdvance]);

  useEffect(() => {
    params.then((p) => setToken(p.token));
  }, [params]);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/assessment/${token}/questions`)
      .then((r) => {
        if (!r.ok) throw new Error(r.status === 403 ? "Access denied. Please complete payment first." : "Assessment not found.");
        return r.json();
      })
      .then((d) => setQuestions(d.questions.sort((a: QuestionItem, b: QuestionItem) => a.order - b.order)))
      .catch((e) => setPageError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  const progress = questions.length > 0 ? Math.round(((current + 1) / questions.length) * 100) : 0;
  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const currentQ = questions[current] ?? null;

  function selectAnswer(qId: string, val: number) {
    if (isTransitioning || !qId) return;

    setAnswers((prev) => ({ ...prev, [qId]: val }));
    setIsTransitioning(true);

    // Clear first: two clicks in the same tick both see isTransitioning === false
    // (state updates are async), so this is what guarantees a single live timer.
    clearAdvance();
    advanceTimer.current = setTimeout(() => {
      advanceTimer.current = null;
      setIsTransitioning(false);
      if (current < questions.length - 1) {
        setCurrent((c) => c + 1);
      } else {
        setShowReview(true);
      }
    }, 300);
  }

  const goNext = useCallback(() => {
    clearAdvance();
    setIsTransitioning(false);
    if (current < questions.length - 1) setCurrent((c) => c + 1);
    else setShowReview(true);
  }, [current, questions.length, clearAdvance]);

  const goPrev = useCallback(() => {
    clearAdvance();
    setIsTransitioning(false);
    if (showReview) setShowReview(false);
    else if (current > 0) setCurrent((c) => c - 1);
  }, [current, showReview, clearAdvance]);

  async function handleSubmit() {
    if (!allAnswered) {
      setErrorMsg("Please answer all questions before submitting.");
      return;
    }
    if (submitted || submitting) return;

    setSubmitting(true);
    setErrorMsg("");

    const responses = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));

    try {
      const res = await fetch(`/api/assessment/${token}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Submission failed.");
      setSubmitted(true);
      router.push(`/report/${data.reportId}`);
    } catch (err: unknown) {
      setErrorMsg(
        err instanceof Error
          ? `We couldn't submit your assessment. Your responses have been preserved. ${err.message}`
          : "Submission failed. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingScreen message="Loading your assessment…" />;
  if (pageError) return <ErrorScreen message={pageError} />;

  if (showReview) {
    const unanswered = questions.filter((q) => answers[q.id] === undefined);
    return (
      <PageShell>
        <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-[0_28px_42px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Assessment review</p>
              <h2 className="mt-2 text-2xl font-black tracking-[-0.06em] text-[#10233d]">Check your answers before submitting</h2>
            </div>
            <div className="rounded-full bg-[#edf3f8] px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em] text-[#1d4f7a]">
              {answeredCount}/{questions.length} answered
            </div>
          </div>

          {unanswered.length > 0 && (
            <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <strong>Unanswered questions:</strong> {unanswered.map((q) => `#${q.order}`).join(", ")}. Please go back and answer them.
            </div>
          )}

          {errorMsg && (
            <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {errorMsg}
            </div>
          )}

          <div className="mb-7 space-y-3">
            {questions.map((q) => (
              <button
                key={q.id}
                onClick={() => {
                  setShowReview(false);
                  setCurrent(questions.findIndex((item) => item.id === q.id));
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-slate-200 bg-[#f8fafc] p-4 text-left transition-all hover:border-[#b7d5e8] hover:bg-white"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#edf3f8] text-xs font-black text-[#1d4f7a]">
                  {q.order}
                </span>
                <span className="flex-1 text-sm font-medium text-slate-700">{q.text}</span>
                <span className={`text-xs font-bold ${answers[q.id] ? "text-[#10233d]" : "text-red-600"}`}>
                  {answers[q.id] ? LABELS[answers[q.id] - 1] : "Missed"}
                </span>
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              onClick={goPrev}
              className="flex-1 rounded-full border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
            >
              Back to assessment
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting || submitted}
              className="flex-1 rounded-full bg-[#10233d] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(16,35,61,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#0d1f35] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit assessment"}
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="mx-auto w-full max-w-3xl rounded-[2rem] border border-slate-200 bg-white/80 p-5 shadow-[0_28px_42px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-8">
        {/* ── Header: Q number + answered counter ── */}
        <div className="mb-5 flex items-center justify-between gap-4">
          <p className="text-sm font-black tracking-[-0.02em] text-[#10233d]">
            Question {current + 1}
            <span className="ml-1 font-semibold text-slate-400">/ {questions.length}</span>
          </p>
          <p className="rounded-full bg-[#edf3f8] px-3 py-1.5 text-xs font-bold tabular-nums text-[#1d4f7a]">
            {answeredCount} answered
          </p>
        </div>

        {/* ── Progress bar (single source of progress info) ── */}
        <div className="mb-8 h-2 overflow-hidden rounded-full bg-[#edf3f8]">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[#1d4f7a] via-[#10233d] to-[#2b7a78] transition-all duration-300"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Assessment progress: ${progress}%`}
          />
        </div>

        {/* ── Question text ── */}
        <div className="mb-8 rounded-2xl border border-slate-200/80 bg-[#f8fafc] px-5 py-6 sm:px-8 sm:py-8">
          <p className="text-lg font-semibold leading-8 text-[#10233d] sm:text-xl">
            {currentQ?.text}
          </p>
        </div>

        {/* ── Likert scale label ── */}
        <p className="mb-3 text-center text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
          How much do you agree?
        </p>

        {/* ── Answer options — 5-col on lg, stacked on mobile ── */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-5 sm:gap-3">
          {LABELS.map((label, i) => {
            const value = i + 1;
            const selected = currentQ ? answers[currentQ.id] === value : false;
            const disabled = isTransitioning && !selected;

            return (
              <button
                key={value}
                onClick={() => currentQ && selectAnswer(currentQ.id, value)}
                disabled={disabled}
                aria-label={`${label} — ${value} of 5`}
                aria-pressed={selected}
                className={[
                  "relative flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 text-left transition-all duration-200",
                  "sm:flex-col sm:items-center sm:gap-2 sm:px-2 sm:py-4 sm:text-center",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1d4f7a]",
                  selected
                    ? "border-[#2b7a78] bg-[#e8f4f3] shadow-[inset_0_2px_4px_rgba(43,122,120,0.12),0_2px_8px_rgba(43,122,120,0.10)]"
                    : disabled
                      ? "border-slate-200 bg-white opacity-50 cursor-not-allowed"
                      : "border-slate-200 bg-white hover:border-[#b7d5e8] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(15,23,42,0.06)] active:translate-y-0 active:shadow-none",
                ].join(" ")}
              >
                {/* Number badge / checkmark */}
                <span
                  className={[
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black transition-colors duration-200",
                    "sm:h-10 sm:w-10",
                    selected
                      ? "bg-[#10233d] text-white"
                      : "bg-[#edf3f8] text-[#1d4f7a]",
                  ].join(" ")}
                >
                  {selected ? (
                    <svg
                      className="h-4.5 w-4.5"
                      style={{ animation: "confirm-pop 250ms ease-out forwards" }}
                      viewBox="0 0 20 20"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    value
                  )}
                </span>

                {/* Label + status */}
                <div className="sm:space-y-0.5">
                  <p
                    className={[
                      "text-sm font-semibold leading-tight",
                      selected ? "text-[#10233d]" : "text-slate-700",
                    ].join(" ")}
                  >
                    {label}
                  </p>
                  {selected && (
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#2b7a78]">
                      Selected
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {errorMsg && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
            {errorMsg}
          </div>
        )}

        {/* ── Navigation ── */}
        <div className="mt-8 flex gap-3">
          <button
            onClick={goPrev}
            disabled={current === 0}
            className="flex-1 rounded-full border border-slate-200 bg-white px-5 py-3.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Previous
          </button>
          <button
            onClick={goNext}
            disabled={currentQ ? answers[currentQ.id] === undefined : true}
            className="flex-1 rounded-full bg-[#10233d] px-5 py-3.5 text-sm font-semibold text-white shadow-[0_18px_30px_rgba(16,35,61,0.18)] transition-all hover:-translate-y-0.5 hover:bg-[#0d1f35] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {current === questions.length - 1 ? "Review answers" : "Continue"}
          </button>
        </div>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(29,79,122,0.07),_transparent_30%),linear-gradient(180deg,#edf3f8_0%,#f8fafc_100%)]">
      <nav className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/75 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a href="/" className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-[#10233d] text-sm font-black text-white">P</span>
            <span className="text-base font-black tracking-[-0.05em] text-[#10233d]">PsychoMetric Pro</span>
          </a>
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Assessment</span>
        </div>
      </nav>

      <div className="flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">{children}</div>
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <PageShell>
      <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-8 text-center shadow-[0_28px_42px_rgba(15,23,42,0.08)]">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-[#dfeef9] border-t-[#10233d]" />
        <p className="text-sm font-medium text-slate-600">{message}</p>
      </div>
    </PageShell>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <PageShell>
      <div className="max-w-md rounded-[2rem] border border-slate-200 bg-white/80 p-8 text-center shadow-[0_28px_42px_rgba(15,23,42,0.08)]">
        <p className="mb-4 text-4xl">⚠️</p>
        <h2 className="text-xl font-black tracking-[-0.05em] text-[#10233d]">Something went wrong</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">{message}</p>
        <a href="/" className="mt-6 inline-flex rounded-full bg-[#10233d] px-5 py-3 text-sm font-semibold text-white">
          Return home
        </a>
      </div>
    </PageShell>
  );
}

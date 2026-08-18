"use client";

import { useEffect, useState, useCallback } from "react";
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

  const [token, setToken]             = useState<string>("");
  const [questions, setQuestions]     = useState<QuestionItem[]>([]);
  const [answers, setAnswers]         = useState<Record<string, number>>({});
  const [current, setCurrent]         = useState(0);
  const [loading, setLoading]         = useState(true);
  const [submitting, setSubmitting]   = useState(false);
  const [submitted, setSubmitted]     = useState(false);
  const [errorMsg, setErrorMsg]       = useState("");
  const [showReview, setShowReview]   = useState(false);
  const [pageError, setPageError]     = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);

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
  const currentQ = questions[current];

  function selectAnswer(qId: string, val: number) {
    if (isTransitioning) return;
    
    setAnswers((prev) => ({ ...prev, [qId]: val }));
    setIsTransitioning(true);
    
    // Automatic question advancement
    setTimeout(() => {
      setIsTransitioning(false);
      if (current < questions.length - 1) {
         setCurrent((c) => c + 1);
      } else {
         setShowReview(true);
      }
    }, 400);
  }

  const goNext = useCallback(() => {
    setIsTransitioning(false);
    if (current < questions.length - 1) setCurrent((c) => c + 1);
    else setShowReview(true);
  }, [current, questions.length]);

  const goPrev = useCallback(() => {
    setIsTransitioning(false);
    if (showReview) setShowReview(false);
    else if (current > 0) setCurrent((c) => c - 1);
  }, [current, showReview]);

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
      const res  = await fetch(`/api/assessment/${token}/submit`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ responses }),
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
        <div className="max-w-2xl w-full mx-auto">
          <h2 className="text-xl font-bold text-[#1e3a5f] mb-2">Review Your Responses</h2>
          <p className="text-slate-500 text-sm mb-6">{answeredCount} of {questions.length} questions answered.</p>

          {unanswered.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-5 text-sm text-amber-800">
              <strong>Unanswered questions:</strong> {unanswered.map((q) => `#${q.order}`).join(", ")}. Please go back and answer them.
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5" role="alert">
              {errorMsg}
            </div>
          )}

          <div className="space-y-2 mb-8 max-h-64 overflow-y-auto pr-1">
            {questions.map((q) => (
              <div key={q.id} className="flex items-start gap-3 text-sm p-4 bg-neu-bg shadow-neu-pressed rounded-xl mb-3">
                <span className="text-slate-400 w-6 shrink-0 font-bold">{q.order}.</span>
                <span className="flex-1 text-slate-700 font-medium">{q.text}</span>
                <span className={`shrink-0 font-bold ${answers[q.id] ? "text-[#1e3a5f]" : "text-red-500"}`}>
                  {answers[q.id] ? LABELS[answers[q.id] - 1] : "Missed"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-4 mt-6">
            <button
              onClick={goPrev}
              className="flex-1 bg-neu-bg shadow-neu-flat hover:shadow-neu-pressed text-slate-600 font-bold py-4 rounded-xl transition-all"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting || submitted}
              className="flex-1 bg-neu-bg shadow-neu-flat hover:shadow-neu-pressed text-[#1e3a5f] font-bold py-4 rounded-xl transition-all disabled:opacity-60 disabled:shadow-neu-flat"
            >
              {submitting ? "Submitting…" : "Submit Assessment ✓"}
            </button>
          </div>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <div className="max-w-2xl w-full mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <span className="text-sm font-medium text-slate-500">Question {current + 1} of {questions.length}</span>
          <span className="text-sm font-medium text-[#1e3a5f]">{progress}%</span>
        </div>

        {/* Progress bar */}
        <div className="h-2.5 bg-neu-bg shadow-neu-pressed rounded-full mb-10 overflow-hidden">
          <div
            className="h-full bg-[#1e3a5f] shadow-neu-flat rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <div className="bg-neu-bg shadow-neu-flat rounded-3xl p-8 mb-8 min-h-[140px] flex items-center border-4 border-neu-bg">
          <p className="text-[#1e3a5f] text-xl leading-relaxed font-semibold">{currentQ?.text}</p>
        </div>

        {/* Likert options */}
        <div className="grid grid-cols-5 gap-3 sm:gap-4 mb-10">
          {LABELS.map((label, i) => {
            const val = i + 1;
            const selected = answers[currentQ?.id] === val;
            return (
              <button
                key={val}
                onClick={() => { selectAnswer(currentQ.id, val); }}
                disabled={isTransitioning && !selected}
                aria-label={label}
                aria-pressed={selected}
                className={`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-2xl transition-all duration-200 relative overflow-hidden ${
                  selected
                    ? "bg-neu-bg shadow-neu-pressed border-2 border-[var(--color-accent)] text-[var(--color-accent)] ring-1 ring-[var(--color-accent)]/20 scale-[0.98]"
                    : "bg-neu-bg shadow-neu-flat border-2 border-transparent text-slate-500 hover:shadow-neu-pressed focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
                }`}
              >
                <span className="text-xl sm:text-2xl font-bold flex items-center gap-1">
                  {selected ? (
                    <span className="text-sm">●</span>
                  ) : (
                    <span className="text-sm opacity-50">○</span>
                  )}
                  {val}
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold text-center leading-tight hidden sm:block px-1">
                  {label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Mobile labels */}
        <div className="flex justify-between text-[10px] text-slate-400 mb-8 sm:hidden px-1">
          <span>Strongly Disagree</span>
          <span>Strongly Agree</span>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4" role="alert">
            {errorMsg}
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-4">
          <button
            onClick={goPrev}
            disabled={current === 0}
            className="flex-1 bg-neu-bg shadow-neu-flat text-slate-600 font-bold py-4 rounded-xl hover:shadow-neu-pressed transition-all disabled:opacity-40 disabled:shadow-neu-flat disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <button
            onClick={goNext}
            disabled={answers[currentQ?.id] === undefined}
            className="flex-1 bg-neu-bg shadow-neu-flat text-[#1e3a5f] font-bold py-4 rounded-xl hover:shadow-neu-pressed transition-all disabled:opacity-40 disabled:shadow-neu-flat disabled:cursor-not-allowed"
          >
            {current === questions.length - 1 ? "Review →" : "Skip →"}
          </button>
        </div>

        <p className="text-center text-xs text-slate-400 mt-4">
          {answeredCount} of {questions.length} answered
        </p>
      </div>
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neu-bg flex flex-col">
      <nav className="bg-neu-bg/80 backdrop-blur shadow-sm px-6 py-4 z-10 sticky top-0">
        <a href="/" className="font-bold text-[#1e3a5f] text-base tracking-tight">PsychoMetric Pro</a>
      </nav>
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        {children}
      </div>
    </div>
  );
}

function LoadingScreen({ message }: { message: string }) {
  return (
    <PageShell>
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-500 text-sm">{message}</p>
      </div>
    </PageShell>
  );
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <PageShell>
      <div className="max-w-md text-center">
        <p className="text-4xl mb-4">⚠️</p>
        <h2 className="text-lg font-semibold text-slate-800 mb-2">Something went wrong</h2>
        <p className="text-slate-500 text-sm mb-6">{message}</p>
        <a href="/" className="text-[#1e3a5f] underline text-sm">Return to home</a>
      </div>
    </PageShell>
  );
}

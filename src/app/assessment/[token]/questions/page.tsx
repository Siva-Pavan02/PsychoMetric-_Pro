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
    setAnswers((prev) => ({ ...prev, [qId]: val }));
  }

  const goNext = useCallback(() => {
    if (current < questions.length - 1) setCurrent((c) => c + 1);
    else setShowReview(true);
  }, [current, questions.length]);

  const goPrev = useCallback(() => {
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
              <div key={q.id} className="flex items-start gap-3 text-sm p-3 bg-white rounded-lg border border-slate-100">
                <span className="text-slate-400 w-6 shrink-0">{q.order}.</span>
                <span className="flex-1 text-slate-700">{q.text}</span>
                <span className={`shrink-0 font-medium ${answers[q.id] ? "text-[#1e3a5f]" : "text-red-400"}`}>
                  {answers[q.id] ? LABELS[answers[q.id] - 1] : "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <button
              onClick={goPrev}
              className="flex-1 border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={handleSubmit}
              disabled={!allAnswered || submitting || submitted}
              className="flex-1 bg-[#1e3a5f] text-white font-semibold py-3 rounded-xl hover:bg-[#16304f] transition-colors disabled:opacity-60"
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
        <div className="h-2 bg-slate-100 rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-[#1e3a5f] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Question */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm mb-6 min-h-[140px] flex items-center">
          <p className="text-slate-800 text-lg leading-relaxed font-medium">{currentQ?.text}</p>
        </div>

        {/* Likert options */}
        <div className="grid grid-cols-5 gap-2 mb-8">
          {LABELS.map((label, i) => {
            const val = i + 1;
            const selected = answers[currentQ?.id] === val;
            return (
              <button
                key={val}
                onClick={() => { selectAnswer(currentQ.id, val); }}
                aria-label={label}
                aria-pressed={selected}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
                  selected
                    ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:border-[#1e3a5f]/50"
                }`}
              >
                <span className="text-xl font-bold">{val}</span>
                <span className="text-[9px] text-center leading-tight hidden sm:block">{label}</span>
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
        <div className="flex gap-3">
          <button
            onClick={goPrev}
            disabled={current === 0}
            className="flex-1 border border-slate-200 text-slate-700 font-semibold py-3 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <button
            onClick={goNext}
            disabled={answers[currentQ?.id] === undefined}
            className="flex-1 bg-[#1e3a5f] text-white font-semibold py-3 rounded-xl hover:bg-[#16304f] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {current === questions.length - 1 ? "Review →" : "Next →"}
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <nav className="border-b border-slate-100 bg-white px-6 py-4">
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

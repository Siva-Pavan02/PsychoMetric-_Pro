"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import Link from "next/link";
import { getPricing } from "./actions";

type Step = "details" | "paying" | "confirming" | "done";

interface FormState {
  name: string;
  email: string;
  phone: string;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function AssessmentPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("details");
  const [priceString, setPriceString] = useState<string>("₹99"); // Fallback, will update on mount
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    getPricing().then((res) => {
      setPriceString(res.currency === "INR" ? `₹${res.amount}` : `${res.currency} ${res.amount}`);
    }).catch(console.error);
  }, []);

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim() || form.name.trim().length < 2) e.name = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = "Please enter a valid email address.";
    if (!/^\+?[0-9\s\-()]{7,20}$/.test(form.phone)) e.phone = "Please enter a valid phone number.";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmitDetails(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/assessment/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const ct = res.headers.get("content-type") ?? "";
      let data: unknown;
      if (ct.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(text || `Server error (HTTP ${res.status})`);
      }

      if (!res.ok) {
        throw new Error(
          typeof data === "object" && data !== null && "error" in data
            ? String((data as { error: unknown }).error)
            : "Failed to create assessment"
        );
      }

      const payload = data as { assessmentId: string };
      await initiatePayment(payload.assessmentId);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function initiatePayment(aId: string) {
    setStep("paying");
    setLoading(true);

    const res = await fetch("/api/payment/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ assessmentId: aId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setErrorMsg("Could not initiate payment. Please try again.");
      setStep("details");
      setLoading(false);
      return;
    }

    setLoading(false);

    const options = {
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: data.currency,
      name: "PsychoMetric Pro",
      description: "OCEAN Personality Assessment",
      order_id: data.orderId,
      prefill: { name: form.name, email: form.email, contact: form.phone },
      theme: { color: "#10233d" },
      handler: async (response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        await handlePaymentSuccess(aId, response);
      },
      modal: {
        ondismiss: () => {
          setStep("details");
          setErrorMsg("Payment was cancelled. You can try again.");
        },
      },
      config: {
        display: {
          blocks: {
            upi: {
              name: "Pay using UPI / QR",
              instruments: [{ method: "upi" }],
            },
            other: {
              name: "Other Payment Modes",
              instruments: [{ method: "card" }, { method: "netbanking" }, { method: "wallet" }],
            },
          },
          sequence: ["block.upi", "block.other"],
          preferences: {
            show_default_blocks: true,
          },
        },
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  }

  async function handlePaymentSuccess(
    aId: string,
    response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }
  ) {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/payment/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assessmentId: aId,
          razorpayOrderId: response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        }),
      });

      if (res.ok) {
        router.push(`/assessment/${aId}/questions`);
        return;
      }

      // Verify failed — poll /api/payment/status (webhook may have unlocked it)
      setStep("confirming");
      setLoading(false);
      await pollPaymentStatus(aId);
    } catch {
      setStep("confirming");
      setLoading(false);
      await pollPaymentStatus(aId);
    }
  }

  async function pollPaymentStatus(aId: string) {
    const maxAttempts = 20; // 3 s × 20 = 60 s
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      try {
        const res  = await fetch("/api/payment/status", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ assessmentId: aId }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.assessmentStatus === "QUESTIONS_UNLOCKED" || data.assessmentStatus === "COMPLETED") {
            // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- full reload ensures clean state after Razorpay
            window.location.assign(`/assessment/${aId}/questions`);
            return;
          }
        }
      } catch {
        // network blip — keep polling
      }
    }
    // Timed out
    setStep("details");
    setErrorMsg("We could not confirm your payment automatically. Please use the recovery link below or contact support.");
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="flex min-h-screen flex-col bg-[#f4f7f9] text-slate-800 selection:bg-[#2b7a78]/20 selection:text-[#10233d]">
        {/* COMPACT TOP HEADER */}
        <header className="border-b border-slate-200/80 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-6">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[radial-gradient(circle_at_top,_rgba(29,79,122,0.18),_rgba(29,79,122,0.04))] text-xs font-black text-[#10233d] shadow-[0_8px_20px_rgba(16,35,61,0.08)]">
                🌊
              </span>
              <span className="text-base font-bold tracking-tight text-[#10233d]">PsychoMetric Pro</span>
            </Link>
            
            <div className="flex items-center gap-5 text-[11px] font-semibold text-slate-500 sm:text-xs">
              <div className="hidden items-center gap-1.5 sm:flex">
                <svg className="h-3.5 w-3.5 text-[#2b7a78]" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                Secure & Encrypted
              </div>
              <div className="hidden h-3 w-px bg-slate-200 sm:block" />
              <div className="flex items-center gap-1.5">
                Payments by <span className="font-bold text-[#10233d]">Razorpay</span>
              </div>
            </div>
          </div>
        </header>

        {/* CENTERED CHECKOUT CARD */}
        <main className="flex flex-1 items-center justify-center p-4 sm:p-6 lg:p-8">
          <div className="flex w-full max-w-5xl flex-col overflow-hidden rounded-[1.5rem] bg-white shadow-xl shadow-slate-200/50 ring-1 ring-slate-100 lg:flex-row lg:h-auto">
            
            {/* LEFT PANEL - VALUE PROPOSITION (38%) */}
            <aside className="relative flex flex-col justify-between overflow-hidden bg-[#10233d] p-6 lg:w-[38%] lg:p-10">
              <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_top_right,_rgba(43,122,120,0.15),_transparent_60%)]" />
              
              <div className="relative z-10">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-sky-200 backdrop-blur-sm">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#2b7a78]" />
                  Premium Assessment
                </div>
                
                <h1 className="mt-5 text-2xl font-bold leading-tight tracking-tight text-white lg:text-3xl">
                  Understand yourself with clarity.
                </h1>
                
                <p className="mt-4 text-sm leading-relaxed text-slate-300 lg:text-base">
                  Measure your core behavioral tendencies through a structured OCEAN assessment and receive a practical, personalized profile.
                </p>
                
                {/* Compact 4-benefit list */}
                <div className="mt-8 grid gap-4 border-t border-white/10 pt-8">
                  {[
                    { icon: "01 ANSWER", desc: "50 structured questions" },
                    { icon: "02 DISCOVER", desc: "Your OCEAN personality profile" },
                    { icon: "03 UNDERSTAND", desc: "Strengths and development areas" },
                    { icon: "04 RECEIVE", desc: "Personalized report + PDF" },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1e3a5f] text-[9px] text-[#2b7a78]">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <div>
                        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-sky-300">{item.icon}</p>
                        <p className="mt-0.5 text-xs font-medium text-slate-200">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </aside>

            {/* RIGHT PANEL - FORM & PAYMENT (62%) */}
            <section className="flex flex-1 flex-col justify-center p-6 lg:w-[62%] lg:p-10">
              <div className="mx-auto w-full max-w-md">
                
                {/* STEP INDICATOR */}
                <div className="mb-8">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-1 items-center gap-3">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300 ${step === "details" ? "bg-[#10233d] text-white" : "bg-[#2b7a78] text-white"}`}>
                        {step === "details" ? "1" : "✓"}
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-[0.15em] transition-colors duration-300 ${step === "details" ? "text-[#10233d]" : "text-slate-400"}`}>Details</span>
                    </div>
                    <div className="h-px w-8 bg-slate-200" />
                    <div className="flex flex-1 items-center gap-3">
                      <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300 ${step === "paying" ? "bg-[#10233d] text-white" : "bg-slate-100 text-slate-400"}`}>
                        2
                      </div>
                      <span className={`text-[11px] font-bold uppercase tracking-[0.15em] transition-colors duration-300 ${step === "paying" ? "text-[#10233d]" : "text-slate-400"}`}>Payment</span>
                    </div>
                  </div>
                </div>

                {/* DETAILS STEP */}
                {step === "details" && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                    <div className="mb-6">
                      <h2 className="text-xl font-bold tracking-tight text-[#10233d]">Participant Details</h2>
                      <p className="mt-1.5 text-xs text-slate-500">Enter your details to register for the assessment and receive your report.</p>
                    </div>

                    {errorMsg && (
                      <div role="alert" className="mb-5 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
                        <div className="flex items-start gap-2.5">
                          <svg className="h-4 w-4 shrink-0 text-red-600" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                          <p className="text-xs font-semibold leading-tight">{errorMsg}</p>
                        </div>
                        {errorMsg.includes("recovery link") && (
                          <p className="mt-2 text-xs">
                            <Link href="/assessment/resume" className="font-bold underline">Recover your assessment →</Link>
                          </p>
                        )}
                      </div>
                    )}

                    <form onSubmit={handleSubmitDetails} noValidate className="space-y-3.5">
                      <Field
                        label="Full name"
                        id="name"
                        type="text"
                        value={form.name}
                        error={errors.name}
                        placeholder="e.g. Priya Sharma"
                        onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                      />
                      <Field
                        label="Email address"
                        id="email"
                        type="email"
                        value={form.email}
                        error={errors.email}
                        placeholder="you@example.com"
                        onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                      />
                      <Field
                        label="Phone number"
                        id="phone"
                        type="tel"
                        value={form.phone}
                        error={errors.phone}
                        placeholder="+91 98765 43210"
                        onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                      />

                      {/* COMPACT PRICE SUMMARY */}
                      <div className="mt-5 flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                        <div>
                          <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-500">Total Due</p>
                          <p className="mt-0.5 text-2xl font-bold tracking-tight text-[#10233d]">{priceString}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[11px] font-bold text-slate-700">One-time assessment fee</p>
                          <p className="mt-0.5 text-[10px] text-slate-500">Includes full PDF report</p>
                        </div>
                      </div>

                      {/* PRIMARY CTA */}
                      <button
                        type="submit"
                        disabled={loading}
                        className="group mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#10233d] px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-[#0d1f35] focus:outline-none focus:ring-2 focus:ring-[#10233d] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-80"
                      >
                        {loading ? (
                          <>
                            <svg className="h-4 w-4 animate-spin text-white/70" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <svg className="h-3.5 w-3.5 opacity-80" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
                            <span>Continue to secure payment</span>
                            <svg className="h-4 w-4 opacity-80 transition-transform duration-200 group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                          </>
                        )}
                      </button>
                      
                      <div className="flex justify-center pt-2">
                        <p className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                          Your information is secure and will never be shared.
                        </p>
                      </div>
                    </form>
                  </div>
                )}

                {/* PAYING STEP */}
                {step === "paying" && (
                  <div className="py-12 text-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 shadow-sm ring-1 ring-slate-100">
                      <svg className="absolute h-full w-full animate-[spin_3s_linear_infinite] text-[#2b7a78]/20" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="60 40" strokeLinecap="round" /></svg>
                      <svg className="h-6 w-6 text-[#10233d]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-[#10233d]">Secure Checkout</h3>
                    <p className="mx-auto mt-3 max-w-[260px] text-xs leading-relaxed text-slate-500">
                      Your secure payment window is open. Please complete the transaction to begin your assessment.
                    </p>
                  </div>
                )}

                {/* CONFIRMING STEP — polls /api/payment/status */}
                {step === "confirming" && (
                  <div className="py-12 text-center animate-in fade-in zoom-in-95 duration-500">
                    <div className="relative mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 shadow-sm ring-1 ring-slate-100">
                      <svg className="absolute h-full w-full animate-[spin_2s_linear_infinite] text-[#2b7a78]/30" viewBox="0 0 100 100"><circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeWidth="4" strokeDasharray="60 40" strokeLinecap="round" /></svg>
                      <svg className="h-6 w-6 text-[#2b7a78]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    </div>
                    <h3 className="text-xl font-bold tracking-tight text-[#10233d]">Confirming your payment…</h3>
                    <p className="mx-auto mt-3 max-w-[280px] text-xs leading-relaxed text-slate-500">
                      Please wait while we confirm your payment with our servers. This can take up to 60 seconds.
                    </p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </>
  );
}

function Field({
  label,
  id,
  type,
  value,
  error,
  placeholder,
  onChange,
}: {
  label: string;
  id: string;
  type: string;
  value: string;
  error?: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="relative">
      <label htmlFor={id} className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-slate-500">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
        className={`w-full rounded-xl border bg-white px-4 py-3 text-sm text-[#10233d] shadow-sm outline-none transition-all duration-300 placeholder:text-slate-300 focus:ring-4 ${
          error
            ? "border-red-300 focus:border-red-400 focus:ring-red-500/10"
            : "border-slate-200 focus:border-[#2b7a78] focus:ring-[#2b7a78]/10"
        }`}
      />
      {/* Reserve vertical space for error to prevent layout jumps */}
      <div className="mt-1 h-4">
        {error && (
          <p id={`${id}-error`} role="alert" className="text-xs font-semibold text-red-500 animate-in fade-in slide-in-from-top-1">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

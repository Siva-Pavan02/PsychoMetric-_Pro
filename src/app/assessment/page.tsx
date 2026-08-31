"use client";

import { useState } from "react";
import Script from "next/script";

type Step = "details" | "paying" | "done";

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
  const [step, setStep] = useState<Step>("details");
  const [form, setForm] = useState<FormState>({ name: "", email: "", phone: "" });
  const [errors, setErrors] = useState<Partial<FormState>>({});
  const [assessmentId, setAssId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

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
      setAssId(payload.assessmentId);
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

      if (!res.ok) {
        throw new Error("Payment verification failed. Please contact support.");
      }

      window.location.href = `/assessment/${aId}/questions`;
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Payment could not be verified. Please contact support.");
      setStep("details");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="afterInteractive" />

      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(29,79,122,0.07),_transparent_32%),linear-gradient(180deg,#edf3f8_0%,#f8fafc_100%)] px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <aside className="hidden rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-[0_28px_40px_rgba(15,23,42,0.08)] lg:flex lg:flex-col lg:justify-between">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#10233d] text-sm font-black text-white">P</span>
                <span className="text-lg font-black tracking-[-0.05em] text-[#10233d]">PsychoMetric Pro</span>
              </div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Profile assessment</p>
              <h1 className="mt-4 text-3xl font-black tracking-[-0.08em] text-[#10233d]">A reliable view of your personality.</h1>
              <p className="mt-5 text-base leading-7 text-slate-600">
                Explore your core behavioral tendencies through a structured, research-backed OCEAN assessment and receive a clear, practical report.
              </p>
            </div>

            <div className="space-y-4 rounded-[1.5rem] bg-[#edf3f8] p-6">
              {[
                "50 validated questions",
                "Instant report unlock",
                "Secure payment flow",
              ].map((item) => (
                <div key={item} className="flex items-center gap-3 text-sm font-medium text-slate-700">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#1d4f7a] text-[10px] font-black text-white shadow-sm">✓</span>
                  {item}
                </div>
              ))}
            </div>
          </aside>

          <div className="mx-auto w-full max-w-xl">
            <div className="mb-8 text-center lg:text-left">
              <a href="/" className="inline-block text-xl font-black tracking-[-0.06em] text-[#10233d] lg:hidden">
                PsychoMetric Pro
              </a>
              <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 lg:hidden">OCEAN personality assessment</p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-[0_28px_42px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:p-10">
              <div className="mb-10">
                <div className="flex gap-3">
                  {(["details", "paying"] as Step[]).map((s, index) => {
                    const active = step === s || (step === "done" || (index === 0 && step !== "details"));
                    return (
                      <div
                        key={s}
                        className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                          active ? "bg-[#10233d]" : "bg-[#edf3f8]"
                        }`}
                      />
                    );
                  })}
                </div>
                <div className="mt-4 flex justify-between px-1 text-[11px] font-bold uppercase tracking-[0.15em]">
                  <span className={step === "details" ? "text-[#10233d]" : "text-[#10233d]"}>01 Details</span>
                  <span className={step === "paying" ? "text-[#1d4f7a]" : step === "done" ? "text-[#10233d]" : "text-slate-400"}>02 Payment</span>
                </div>
              </div>

              {step === "paying" && (
                <div className="py-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-[3px] border-[#edf3f8] border-t-[#1d4f7a]" />
                  <h3 className="text-xl font-black tracking-[-0.04em] text-[#10233d]">Secure Payment</h3>
                  <p className="mx-auto mt-3 max-w-[280px] text-sm leading-relaxed text-slate-500">
                    A secure Razorpay window has been opened. Please complete the ₹99 payment to begin.
                  </p>
                </div>
              )}

              {step === "details" && (
                <div className="animate-in fade-in duration-500">
                  <div className="mb-8">
                    <h2 className="text-2xl font-black tracking-[-0.06em] text-[#10233d]">Your details</h2>
                    <p className="mt-2 text-sm leading-6 text-slate-600">We only need a few details before your assessment is unlocked.</p>
                  </div>

                  {errorMsg && (
                    <div className="mb-8 flex items-start gap-3 rounded-[1.2rem] border border-red-200 bg-red-50/50 p-4">
                      <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">!</div>
                      <p className="text-sm font-medium text-red-800">{errorMsg}</p>
                    </div>
                  )}

                  <form onSubmit={handleSubmitDetails} noValidate className="space-y-5">
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

                    <div className="mt-8 rounded-[1.5rem] border border-[#1d4f7a]/10 bg-gradient-to-br from-[#f8fafc] to-[#edf3f8] p-5 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Assessment Fee</p>
                          <div className="mt-1 flex items-baseline gap-1">
                            <span className="text-3xl font-black tracking-[-0.08em] text-[#10233d]">₹99</span>
                            <span className="text-sm font-semibold text-slate-500">INR</span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <div className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-[#1d4f7a] shadow-sm">
                            <span className="text-xs">🔒</span> Secure
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={loading}
                      className="group relative mt-2 w-full overflow-hidden rounded-full bg-[#10233d] px-6 py-4 text-base font-semibold text-white shadow-[0_18px_30px_rgba(16,35,61,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#0d1f35] hover:shadow-[0_22px_36px_rgba(16,35,61,0.25)] disabled:opacity-85 disabled:hover:translate-y-0 disabled:hover:shadow-[0_18px_30px_rgba(16,35,61,0.18)]"
                    >
                      {loading ? (
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                          <span>Preparing payment...</span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-2">
                          <span>Continue to Payment</span>
                          <span className="transition-transform duration-300 group-hover:translate-x-1">→</span>
                        </div>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
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
    <div>
      <label htmlFor={id} className="mb-2 block text-[13px] font-bold text-[#10233d]">
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
        className={`w-full rounded-2xl border px-5 py-3.5 text-base text-[#10233d] placeholder:text-slate-400 outline-none transition-all duration-300 ${
          error
            ? "border-red-300 bg-red-50/50 shadow-[0_0_0_4px_rgba(239,68,68,0.05)] focus:border-red-400 focus:shadow-[0_0_0_4px_rgba(239,68,68,0.1)]"
            : "border-slate-200 bg-[#f8fafc] focus:border-[#1d4f7a] focus:bg-white focus:shadow-[0_0_0_4px_rgba(29,79,122,0.08)]"
        }`}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-2 text-[13px] font-medium text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

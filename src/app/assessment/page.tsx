"use client";

import { useState } from "react";
import Script from "next/script";

type Step = "details" | "paying" | "done";

interface FormState {
  name:  string;
  email: string;
  phone: string;
}

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

export default function AssessmentPage() {
  const [step, setStep]           = useState<Step>("details");
  const [form, setForm]           = useState<FormState>({ name: "", email: "", phone: "" });
  const [errors, setErrors]       = useState<Partial<FormState>>({});
  const [assessmentId, setAssId]  = useState<string>("");
  const [loading, setLoading]     = useState(false);
  const [errorMsg, setErrorMsg]   = useState<string>("");

  function validate(): boolean {
    const e: Partial<FormState> = {};
    if (!form.name.trim() || form.name.trim().length < 2)  e.name  = "Please enter your full name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))   e.email = "Please enter a valid email address.";
    if (!/^\+?[0-9\s\-()]{7,20}$/.test(form.phone))       e.phone = "Please enter a valid phone number.";
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
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
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

    const res  = await fetch("/api/payment/create-order", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ assessmentId: aId }),
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
      key:      process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount:   data.amount,
      currency: data.currency,
      name:     "PsychoMetric Pro",
      description: "OCEAN Personality Assessment",
      order_id: data.orderId,
      prefill: { name: form.name, email: form.email, contact: form.phone },
      theme:   { color: "#1e3a5f" },
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
              instruments: [
                { method: "upi" }
              ]
            },
            other: {
              name: "Other Payment Modes",
              instruments: [
                { method: "card" },
                { method: "netbanking" },
                { method: "wallet" }
              ]
            }
          },
          sequence: ["block.upi", "block.other"],
          preferences: {
            show_default_blocks: true,
          }
        }
      }
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
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          assessmentId:      aId,
          razorpayOrderId:   response.razorpay_order_id,
          razorpayPaymentId: response.razorpay_payment_id,
          razorpaySignature: response.razorpay_signature,
        }),
      });

      if (!res.ok) {
        throw new Error("Payment verification failed. Please contact support.");
      }

      // Redirect to questions
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

      <div className="min-h-screen bg-neu-bg flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <a href="/" className="font-bold text-[#1e3a5f] text-xl tracking-tight">PsychoMetric Pro</a>
            <p className="text-slate-500 text-sm mt-1">OCEAN Personality Assessment</p>
          </div>

          <div className="bg-neu-bg rounded-3xl shadow-neu-flat p-10 border-4 border-neu-bg">
            {/* Progress */}
            <div className="flex gap-3 mb-8">
              {(["details", "paying"] as Step[]).map((s, i) => {
                const active = step === s || (step === "done" || (i === 0 && step !== "details"));
                return (
                  <div
                    key={s}
                    className={`h-2 flex-1 rounded-full transition-all ${
                      active ? "bg-[#1e3a5f] shadow-neu-flat" : "bg-neu-bg shadow-neu-pressed"
                    }`}
                  />
                );
              })}
            </div>

            {step === "paying" && (
              <div className="text-center py-8">
                <div className="w-10 h-10 border-2 border-[#1e3a5f] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-600 font-medium">Opening payment window…</p>
                <p className="text-slate-400 text-sm mt-1">Please complete the payment in the Razorpay window.</p>
              </div>
            )}

            {step === "details" && (
              <>
                <h1 className="text-xl font-bold text-[#1e3a5f] mb-1">Your Details</h1>
                <p className="text-slate-500 text-sm mb-6">We only need a few details to create your assessment.</p>

                {errorMsg && (
                  <div className="bg-neu-bg shadow-neu-pressed ring-1 ring-red-300 text-red-600 text-sm font-medium rounded-xl px-5 py-4 mb-5">
                    {errorMsg}
                  </div>
                )}

                <form onSubmit={handleSubmitDetails} noValidate className="space-y-4">
                  <Field
                    label="Full Name" id="name" type="text" value={form.name}
                    error={errors.name} placeholder="e.g. Priya Sharma"
                    onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                  />
                  <Field
                    label="Email Address" id="email" type="email" value={form.email}
                    error={errors.email} placeholder="you@example.com"
                    onChange={(v) => setForm((f) => ({ ...f, email: v }))}
                  />
                  <Field
                    label="Phone Number" id="phone" type="tel" value={form.phone}
                    error={errors.phone} placeholder="+91 98765 43210"
                    onChange={(v) => setForm((f) => ({ ...f, phone: v }))}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-neu-bg text-[#1e3a5f] font-bold py-4 rounded-xl shadow-neu-flat hover:shadow-neu-pressed transition-all disabled:opacity-60 disabled:hover:shadow-neu-flat mt-4"
                  >
                    {loading ? "Please wait…" : "Continue to Payment →"}
                  </button>

                  <p className="text-center text-xs text-slate-400 mt-2">
                    ₹99 one-time payment · Secured by Razorpay
                  </p>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function Field({
  label, id, type, value, error, placeholder, onChange,
}: {
  label: string; id: string; type: string; value: string;
  error?: string; placeholder: string; onChange: (v: string) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-semibold text-slate-600 mb-2 pl-1">
        {label}
      </label>
      <input
        id={id} type={type} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-describedby={error ? `${id}-error` : undefined}
        aria-invalid={!!error}
        className={`w-full rounded-xl px-5 py-3.5 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] transition-all border-none ${
          error ? "bg-neu-bg shadow-neu-pressed ring-2 ring-red-400" : "bg-neu-bg shadow-neu-pressed"
        }`}
      />
      {error && (
        <p id={`${id}-error`} role="alert" className="text-xs font-medium text-red-500 mt-2 pl-1">{error}</p>
      )}
    </div>
  );
}

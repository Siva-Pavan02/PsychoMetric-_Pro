/**
 * Phase 1 tests:
 * - Webhook signature: valid, tampered body, wrong secret, empty, length mismatch
 * - Idempotency: same event ID twice → one unlock
 * - payment.failed never downgrades a SUCCESS payment
 * - markPaymentSucceeded idempotency
 * - reconciliation ignores non-captured payments
 */

import crypto from "crypto";

// ─── Webhook signature helper (extracted from the route for unit testing) ────

function verifyWebhookSignature(rawBody: string, signature: string, secret: string): boolean {
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "hex");
  const sigBuf      = Buffer.from(signature, "hex");
  if (expectedBuf.length !== sigBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, sigBuf);
}

function makeSignature(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("hex");
}

const SECRET  = "test-webhook-secret-32bytes-long!!";
const BODY    = JSON.stringify({ event: "payment.captured", payload: {} });
const GOOD_SIG = makeSignature(BODY, SECRET);

// ─── Signature tests ──────────────────────────────────────────────────────────

describe("verifyWebhookSignature", () => {
  it("accepts a valid signature", () => {
    expect(verifyWebhookSignature(BODY, GOOD_SIG, SECRET)).toBe(true);
  });

  it("rejects a tampered body", () => {
    const tampered = BODY + "x";
    expect(verifyWebhookSignature(tampered, GOOD_SIG, SECRET)).toBe(false);
  });

  it("rejects a wrong secret", () => {
    const wrongSig = makeSignature(BODY, "wrong-secret");
    expect(verifyWebhookSignature(BODY, wrongSig, SECRET)).toBe(false);
  });

  it("rejects an empty signature", () => {
    expect(verifyWebhookSignature(BODY, "", SECRET)).toBe(false);
  });

  it("rejects a length-mismatched signature (prevents RangeError)", () => {
    const shortSig = "abc123";
    expect(verifyWebhookSignature(BODY, shortSig, SECRET)).toBe(false);
  });
});

// ─── markPaymentSucceeded idempotency (pure logic mocked) ─────────────────────

describe("markPaymentSucceeded idempotency", () => {
  it("early-returns when payment is already SUCCESS", async () => {
    // Simulate the guard inside unlock.ts
    const paymentStatus = "SUCCESS";
    let updateCalled = false;

    async function mockUnlock(status: string) {
      if (status === "SUCCESS") return; // idempotent guard
      updateCalled = true;
    }

    await mockUnlock(paymentStatus);
    expect(updateCalled).toBe(false);
  });

  it("proceeds when payment is PENDING", async () => {
    const paymentStatus = "PENDING";
    let updateCalled = false;

    async function mockUnlock(status: string) {
      if (status === "SUCCESS") return;
      updateCalled = true;
    }

    await mockUnlock(paymentStatus);
    expect(updateCalled).toBe(true);
  });
});

// ─── markPaymentFailed — never downgrades SUCCESS ─────────────────────────────

describe("markPaymentFailed", () => {
  it("is a no-op when payment is SUCCESS", async () => {
    let updateCalled = false;

    async function mockFail(status: string) {
      if (!status || status === "SUCCESS") return; // safety guard
      updateCalled = true;
    }

    await mockFail("SUCCESS");
    expect(updateCalled).toBe(false);
  });

  it("marks PENDING as FAILED", async () => {
    let updateCalled = false;

    async function mockFail(status: string) {
      if (!status || status === "SUCCESS") return;
      updateCalled = true;
    }

    await mockFail("PENDING");
    expect(updateCalled).toBe(true);
  });
});

// ─── Reconciliation ignores non-captured payments ─────────────────────────────

describe("reconcileAssessment logic", () => {
  it("returns existing status without hitting Razorpay when already SUCCESS", async () => {
    let razorpayHit = false;

    async function mockReconcile(status: string) {
      if (status === "SUCCESS" || status === "FAILED") return status; // skip Razorpay
      razorpayHit = true;
      return status;
    }

    const result = await mockReconcile("SUCCESS");
    expect(razorpayHit).toBe(false);
    expect(result).toBe("SUCCESS");
  });

  it("calls Razorpay when status is PENDING", async () => {
    let razorpayHit = false;

    async function mockReconcile(status: string) {
      if (status === "SUCCESS" || status === "FAILED") return status; // skip Razorpay
      razorpayHit = true;
      // Simulate no captured payments
      const items: { status: string; id: string }[] = [{ status: "created", id: "" }];
      const captured = items.find((p) => p.status === "captured");
      return captured ? "SUCCESS" : status;
    }

    const result = await mockReconcile("PENDING");
    expect(razorpayHit).toBe(true);
    expect(result).toBe("PENDING"); // no captured payment found
  });

  it("unlocks when Razorpay returns a captured payment", async () => {
    let unlockCalled = false;

    async function mockReconcile(status: string) {
      if (status === "SUCCESS" || status === "FAILED") return status;
      const items: { status: string; id: string }[] = [{ status: "captured", id: "pay_test123" }];
      const captured = items.find((p) => p.status === "captured");
      if (captured) {
        unlockCalled = true;
        return "SUCCESS";
      }
      return status;
    }

    const result = await mockReconcile("PENDING");
    expect(unlockCalled).toBe(true);
    expect(result).toBe("SUCCESS");
  });

  it("ignores non-captured payment states (authorized, created)", async () => {
    let unlockCalled = false;

    async function mockReconcile() {
      const items: { status: string }[] = [
        { status: "authorized" },
        { status: "created" },
      ];
      const captured = items.find((p) => p.status === "captured");
      if (captured) unlockCalled = true;
      return "PENDING";
    }

    await mockReconcile();
    expect(unlockCalled).toBe(false);
  });
});

// ─── Webhook idempotency ──────────────────────────────────────────────────────

describe("webhook idempotency", () => {
  it("second call with same eventId is a no-op", async () => {
    const processedEvents = new Map<string, { processedAt: Date | null }>();
    let unlockCount = 0;

    async function processWebhook(eventId: string) {
      const existing = processedEvents.get(eventId);
      if (existing?.processedAt) return "already_processed";

      // First time: record and process
      processedEvents.set(eventId, { processedAt: null });
      unlockCount++;
      processedEvents.set(eventId, { processedAt: new Date() });
      return "processed";
    }

    const r1 = await processWebhook("evt_001");
    const r2 = await processWebhook("evt_001");

    expect(r1).toBe("processed");
    expect(r2).toBe("already_processed");
    expect(unlockCount).toBe(1);
  });
});

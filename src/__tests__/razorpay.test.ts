import crypto from "crypto";

const TEST_SECRET = "test_secret_12345678901234567890";
const TEST_ORDER_ID = "order_test_123";
const TEST_PAYMENT_ID = "pay_test_456";

function genSig(secret: string, oid: string, pid: string): string {
  return crypto.createHmac("sha256", secret).update(`${oid}|${pid}`).digest("hex");
}

describe("verifyRazorpaySignature", () => {
  let validSig: string;
  let verifyRazorpaySignature: (orderId: string, paymentId: string, signature: string) => boolean;

  beforeAll(async () => {
    process.env.RAZORPAY_KEY_ID = "test_key_id";
    process.env.RAZORPAY_KEY_SECRET = TEST_SECRET;
    validSig = genSig(TEST_SECRET, TEST_ORDER_ID, TEST_PAYMENT_ID);

    // Reset modules to force re-import with new env vars
    jest.resetModules();
    const mod = await import("../lib/razorpay");
    verifyRazorpaySignature = mod.verifyRazorpaySignature;
  });

  afterAll(() => {
    delete process.env.RAZORPAY_KEY_ID;
    delete process.env.RAZORPAY_KEY_SECRET;
  });

  test("valid signature → true", () => {
    expect(verifyRazorpaySignature(TEST_ORDER_ID, TEST_PAYMENT_ID, validSig)).toBe(true);
  });

  test("invalid same-length signature → false", () => {
    const flipped = validSig.slice(0, -1) + (validSig.slice(-1) === "a" ? "b" : "a");
    expect(verifyRazorpaySignature(TEST_ORDER_ID, TEST_PAYMENT_ID, flipped)).toBe(false);
  });

  test("truncated signature → false (no throw)", () => {
    expect(verifyRazorpaySignature(TEST_ORDER_ID, TEST_PAYMENT_ID, validSig.slice(0, 10))).toBe(false);
  });

  test("empty signature → false (no throw)", () => {
    expect(verifyRazorpaySignature(TEST_ORDER_ID, TEST_PAYMENT_ID, "")).toBe(false);
  });

  test("oversized signature → false (no throw)", () => {
    expect(verifyRazorpaySignature(TEST_ORDER_ID, TEST_PAYMENT_ID, validSig + "extra")).toBe(false);
  });

  test("non-hex signature → false (no throw)", () => {
    expect(verifyRazorpaySignature(TEST_ORDER_ID, TEST_PAYMENT_ID, "not-hex!!!")).toBe(false);
  });

  test("64-char same-length malformed non-hex → false (no throw)", () => {
    // 64 chars (same string length as valid SHA-256 hex) but invalid hex characters
    const malformed = "g".repeat(64);
    expect(verifyRazorpaySignature(TEST_ORDER_ID, TEST_PAYMENT_ID, malformed)).toBe(false);
  });

  test("wrong orderId with valid signature → false", () => {
    const wrongOrderSig = genSig(TEST_SECRET, "order_wrong", TEST_PAYMENT_ID);
    expect(verifyRazorpaySignature(TEST_ORDER_ID, TEST_PAYMENT_ID, wrongOrderSig)).toBe(false);
  });

  test("wrong paymentId with valid signature → false", () => {
    const wrongPaymentSig = genSig(TEST_SECRET, TEST_ORDER_ID, "pay_wrong");
    expect(verifyRazorpaySignature(TEST_ORDER_ID, TEST_PAYMENT_ID, wrongPaymentSig)).toBe(false);
  });
});
import "dotenv/config";
import crypto from "crypto";

async function run() {
  console.log("🚀 Starting E2E API Test...");

  const BASE_URL = "http://localhost:3000";

  // 1. Start Assessment
  console.log("\n[1] Starting assessment...");
  const startRes = await fetch(`${BASE_URL}/api/assessment/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: "E2E Test User",
      email: "test@example.com",
      phone: "1234567890",
    }),
  });
  if (!startRes.ok) throw new Error(`Start failed: ${await startRes.text()}`);
  const { assessmentId } = await startRes.json();
  console.log("✅ Assessment started:", assessmentId);

  // 2. Create Order
  console.log("\n[2] Creating order...");
  const orderRes = await fetch(`${BASE_URL}/api/payment/create-order`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ assessmentId }),
  });
  if (!orderRes.ok) throw new Error(`Create order failed: ${await orderRes.text()}`);
  const { orderId } = await orderRes.json();
  console.log("✅ Order created:", orderId);

  // 3. Verify Payment
  console.log("\n[3] Verifying payment...");
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) throw new Error("Missing RAZORPAY_KEY_SECRET");

  const paymentId = "pay_test_" + Date.now();
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  const verifyRes = await fetch(`${BASE_URL}/api/payment/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assessmentId,
      razorpayOrderId: orderId,
      razorpayPaymentId: paymentId,
      razorpaySignature: signature,
    }),
  });
  if (!verifyRes.ok) throw new Error(`Verify failed: ${await verifyRes.text()}`);
  console.log("✅ Payment verified");

  // 4. Submit Assessment
  console.log("\n[4] Submitting assessment...");
  // Assuming questions are available from API or we just use 50 dummy UUIDs
  // Let's get questions from the API
  const qRes = await fetch(`${BASE_URL}/api/assessment/${assessmentId}/questions`);
  if (!qRes.ok) throw new Error(`Failed to get questions: ${await qRes.text()}`);
  const { questions } = await qRes.json();
  
  const responses = questions.map((q) => ({
    questionId: q.id,
    answer: Math.floor(Math.random() * 5) + 1, // Random 1-5
  }));

  const submitRes = await fetch(`${BASE_URL}/api/assessment/${assessmentId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responses }),
  });
  if (!submitRes.ok) throw new Error(`Submit failed: ${await submitRes.text()}`);
  const { reportId } = await submitRes.json();
  console.log("✅ Assessment submitted. Report ID:", reportId);

  // 5. Duplicate Submission Check
  console.log("\n[5] Checking duplicate submission...");
  const dupRes = await fetch(`${BASE_URL}/api/assessment/${assessmentId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ responses }),
  });
  const dupData = await dupRes.json();
  if (dupData.alreadySubmitted) {
    console.log("✅ Duplicate submission handled safely.");
  } else {
    throw new Error("Duplicate submission not handled correctly.");
  }

  // 6. Fetch Report
  console.log("\n[6] Fetching Report...");
  const reportRes = await fetch(`${BASE_URL}/api/report/${reportId}`);
  if (!reportRes.ok) throw new Error(`Fetch report failed: ${await reportRes.text()}`);
  const reportData = await reportRes.json();
  console.log("✅ Report generated with profile:", reportData.content.overallProfile?.type || "OK");

  // 7. Fetch PDF
  console.log("\n[7] Generating PDF...");
  const pdfRes = await fetch(`${BASE_URL}/api/report/${reportId}/pdf`);
  if (!pdfRes.ok) throw new Error(`PDF generation failed: ${await pdfRes.text()}`);
  console.log("✅ PDF generated, content type:", pdfRes.headers.get("content-type"));

  console.log("\n🎉 ALL E2E API TESTS PASSED!");
}

run().catch((e) => {
  console.error("❌ Test Failed:", e);
  process.exit(1);
});

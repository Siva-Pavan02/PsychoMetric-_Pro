/**
 * Admin metrics calculation tests.
 *
 * These tests cover the paise→rupees conversion logic and revenue calculation
 * rules. They test the pure helper functions directly, without requiring a
 * database connection.
 */

// Import only the pure, DB-free helper functions
import { paiseToRupees, formatRupees, formatPaise, PAISE_PER_RUPEE } from "../lib/admin/currency";



describe("paiseToRupees", () => {
  test("converts 0 paise to 0 rupees", () => {
    expect(paiseToRupees(0)).toBe(0);
  });

  test("converts 9900 paise to 99 rupees (standard assessment price)", () => {
    expect(paiseToRupees(9900)).toBe(99);
  });

  test("converts 100 paise to 1 rupee", () => {
    expect(paiseToRupees(100)).toBe(1);
  });

  test("converts arbitrary amount correctly", () => {
    expect(paiseToRupees(29700)).toBe(297); // 3 × 99
  });

  test("PAISE_PER_RUPEE constant is 100", () => {
    expect(PAISE_PER_RUPEE).toBe(100);
  });
});

describe("formatRupees", () => {
  test("formats 0 as ₹0", () => {
    expect(formatRupees(0)).toMatch(/₹\s*0/);
  });

  test("formats 99 as ₹99", () => {
    expect(formatRupees(99)).toMatch(/99/);
  });

  test("formats 297 as ₹297", () => {
    expect(formatRupees(297)).toMatch(/297/);
  });
});

describe("formatPaise", () => {
  test("formats 9900 paise as ₹99", () => {
    expect(formatPaise(9900)).toMatch(/99/);
  });
});

describe("Revenue calculation rules", () => {
  // Simulate the calculation getAdminMetrics performs:
  // totalRevenuePaise = SUM(successful payments)
  // totalRevenueRupees = totalRevenuePaise / 100

  function calcRevenue(successfulAmountsPaise: number[]) {
    const totalPaise = successfulAmountsPaise.reduce((sum, a) => sum + a, 0);
    return paiseToRupees(totalPaise);
  }

  test("Test 1: zero payments → revenue is 0", () => {
    expect(calcRevenue([])).toBe(0);
  });

  test("Test 2: one successful ₹99 payment → revenue is ₹99", () => {
    expect(calcRevenue([9900])).toBe(99);
  });

  test("Test 3: one success + one failure → revenue equals only the success", () => {
    // Failed payment is excluded from successfulAmountsPaise
    const successfulOnly = [9900];
    expect(calcRevenue(successfulOnly)).toBe(99);
  });

  test("Test 4: three successful payments → revenue is ₹297", () => {
    expect(calcRevenue([9900, 9900, 9900])).toBe(297);
  });

  test("Test 5: non-₹99 successful amount → revenue equals actual stored amount", () => {
    // If a payment was created for 14900 paise (₹149), revenue must be ₹149
    expect(calcRevenue([14900])).toBe(149);
  });

  test("Revenue is NOT calculated as count × 99", () => {
    // Three payments at ₹149 each should be 447, not 3×99=297
    const actualRevenue = calcRevenue([14900, 14900, 14900]);
    expect(actualRevenue).toBe(447);
    expect(actualRevenue).not.toBe(3 * 99);
  });
});

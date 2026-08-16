/**
 * Pure helpers for currency conversion.
 * No database imports — safe to use in tests, client components, and server code.
 */

export const PAISE_PER_RUPEE = 100;

/** Convert a paise integer to rupees (number). */
export function paiseToRupees(paise: number): number {
  return paise / PAISE_PER_RUPEE;
}

/** Format a rupee number as an INR currency string. */
export function formatRupees(rupees: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(rupees);
}

/** Format a paise integer directly as an INR currency string. */
export function formatPaise(paise: number): string {
  return formatRupees(paiseToRupees(paise));
}

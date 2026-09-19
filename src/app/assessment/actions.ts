"use server";
import { config } from "@/lib/config";

export async function getPricing() {
  return {
    amount: config.ASSESSMENT_PRICE_PAISE / 100,
    currency: config.ASSESSMENT_CURRENCY,
  };
}

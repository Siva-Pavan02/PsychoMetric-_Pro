import { z } from "zod";

const envSchema = z.object({
  RESEND_API_KEY: z.string().min(1, "RESEND_API_KEY is required"),
  EMAIL_FROM:     z.string().min(1, "EMAIL_FROM is required"),
  ASSESSMENT_PRICE_PAISE: z.coerce.number().int().min(100).default(9900),
  ASSESSMENT_CURRENCY: z.string().min(3).default("INR"),
});

const env = process.env.NODE_ENV === "test" 
  ? { ...process.env, RESEND_API_KEY: "test-key", EMAIL_FROM: "test@example.com" }
  : process.env;

const parsed = envSchema.safeParse(env);

if (!parsed.success) {
  console.error("Invalid environment variables:", parsed.error.format());
  throw new Error("Invalid environment variables");
}

export const config = parsed.data;

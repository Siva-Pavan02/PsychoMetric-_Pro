import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "PsychoMetric Pro — OCEAN Personality Assessment",
  description:
    "Understand your personality with a professional Big Five / OCEAN assessment. Get a personalised report with insights on strengths, leadership, communication, and career suitability.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-white font-sans antialiased">{children}</body>
    </html>
  );
}

import "./globals.css";
import type { Metadata } from "next";
import { Space_Grotesk } from "next/font/google";

const font = Space_Grotesk({ subsets: ["latin"], variable: "--font-sg" });

export const metadata: Metadata = {
  title: "Personal Finance Dashboard",
  description:
    "Single-user personal finance with Supabase, rules, AI categorization, and drill-down dashboards.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${font.variable} bg-surface text-slate-100 min-h-screen`}>
        {children}
      </body>
    </html>
  );
}

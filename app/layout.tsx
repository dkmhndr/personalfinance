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
      <body
        className={`${font.variable} bg-surface text-slate-100 min-h-screen`}
      >
        <div className="container-wide py-6 space-y-6">
          <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white/5 px-4 py-3 border border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-400/80 to-emerald-400/70 flex items-center justify-center text-slate-900 font-bold">
                🤑
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-brand-200">
                  Personal Finance Tracker
                </div>
                <h1 className="text-lg font-semibold">dkmhndr_ money</h1>
              </div>
            </div>
            <nav className="flex flex-wrap gap-2 text-sm">
              {[
                { href: "/", label: "Dashboard" },
                { href: "/review", label: "Review" },
                { href: "/rules", label: "Rules" },
                { href: "/categories", label: "Categories" },
                { href: "/statements", label: "Statements" },
                { href: "/import", label: "Import CSV" },
              ].map((item) => (
                <a
                  key={item.href}
                  className="rounded-full px-3 py-1.5 bg-white/5 text-slate-100 hover:bg-white/10 transition"
                  href={item.href}
                >
                  {item.label}
                </a>
              ))}
            </nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Wallet, Menu, X, ChevronDown } from "lucide-react";
import { LogoutButton } from "@/components/auth/logout-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const primaryNav = [
  { href: '/', label: 'Dashboard' },
  { href: '/budget', label: 'Budget' },
  { href: '/import', label: 'Import' },
];

const secondaryNav = [{ href: '/data', label: 'Data Console' }];

export function AppNav() {
  const authEnabled = true; // keep client/server markup consistent
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname?.startsWith(`${href}/`);

  return (
    <nav className="sticky top-0 z-30 border-b border-border/60 bg-slate-950/80 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-emerald-400 text-slate-900 shadow-lg shadow-emerald-400/20">
            🤑
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-[0.08em] text-brand-200">Personal Finance</div>
            <p className="truncate text-base font-semibold text-slate-50">dkmhndr_ money</p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-sm font-semibold transition",
                isActive(item.href)
                  ? "bg-white text-slate-900 shadow-sm shadow-emerald-500/20"
                  : "text-slate-100 hover:bg-white/10",
              )}
            >
              {item.label}
            </Link>
          ))}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 pl-3 pr-2"
              onClick={() => setDataOpen((v) => !v)}
              aria-expanded={dataOpen}
            >
              <span className="mr-1">Data</span>
              <ChevronDown size={16} />
            </Button>
            {dataOpen && (
              <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-xl border border-border bg-slate-900/95 shadow-lg shadow-emerald-500/10">
                {secondaryNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block px-3 py-2 text-sm font-semibold text-slate-100 transition hover:bg-white/5",
                      isActive(item.href) ? "text-brand-100" : undefined,
                    )}
                    onClick={() => setDataOpen(false)}
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
          </div>
          {authEnabled && <LogoutButton />}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {authEnabled && <LogoutButton />}
          <Button
            variant="ghost"
            size="sm"
            aria-label="Toggle navigation"
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </Button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-border/60 bg-slate-950/90 px-4 pb-4 pt-3 sm:px-6 md:hidden">
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wide text-muted">Main</div>
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-semibold",
                  isActive(item.href)
                    ? "bg-white text-slate-900"
                    : "text-slate-100 hover:bg-white/5",
                )}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="pt-1 text-xs uppercase tracking-wide text-muted">Data</div>
            {secondaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm font-semibold",
                  isActive(item.href)
                    ? "bg-white text-slate-900"
                    : "text-slate-100 hover:bg-white/5",
                )}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </nav>
  );
}

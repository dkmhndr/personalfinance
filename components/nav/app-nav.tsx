'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Wallet, Menu, X, ChevronDown } from 'lucide-react';
import { LogoutButton } from '@/components/auth/logout-button';
import { Button } from '@/components/ui/button';

const primaryNav = [
  { href: '/', label: 'Dashboard' },
  { href: '/budget', label: 'Budget' },
  { href: '/review', label: 'Review' },
];

const secondaryNav = [
  { href: '/rules', label: 'Rules' },
  { href: '/categories', label: 'Categories' },
  { href: '/statements', label: 'Statements' },
  { href: '/import', label: 'Import' },
];

export function AppNav() {
  const authEnabled = true; // keep client/server markup consistent
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-30 border-b border-border/60 bg-slate-950/70 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400/80 to-emerald-400/70 font-bold text-slate-900">
            🤑
          </div>
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide text-brand-200">Personal Finance</div>
            <p className="truncate text-base font-semibold">dkmhndr_ money</p>
          </div>
        </Link>

        <div className="hidden items-center gap-3 md:flex">
          {primaryNav.map((item) => (
            <Link key={item.href} href={item.href} className="text-sm font-semibold text-slate-100 hover:text-brand-100">
              {item.label}
            </Link>
          ))}
          <div className="relative">
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={() => setDataOpen((v) => !v)}
              aria-expanded={dataOpen}
            >
              Data
              <ChevronDown size={16} />
            </Button>
            {dataOpen && (
              <div className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-border bg-slate-900 shadow-lg shadow-emerald-500/10">
                {secondaryNav.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block px-3 py-2 text-sm text-slate-100 hover:bg-white/5"
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
        <div className="md:hidden border-t border-border/60 bg-slate-950/80 px-4 pb-4 pt-3 sm:px-6">
          <div className="space-y-1">
            <div className="text-xs uppercase tracking-wide text-muted">Main</div>
            {primaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/5"
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            ))}
            <div className="mt-2 text-xs uppercase tracking-wide text-muted">Data</div>
            {secondaryNav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-lg px-3 py-2 text-sm font-semibold text-slate-100 hover:bg-white/5"
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

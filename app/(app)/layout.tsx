import type { ReactNode } from 'react';
import { LogoutButton } from '@/components/auth/logout-button';

export default function AppShellLayout({ children }: { children: ReactNode }) {
  const authEnabled = Boolean(process.env.AUTH_PASSWORD);

  return (
    <div className="container-wide py-6 space-y-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white/5 px-4 py-3 border border-border">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-brand-400/80 to-emerald-400/70 flex items-center justify-center text-slate-900 font-bold">
            🤑
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-brand-200">Personal Finance Tracker</div>
            <h1 className="text-lg font-semibold">dkmhndr_ money</h1>
          </div>
        </div>
        <nav className="flex flex-wrap gap-2 text-sm">
          {[
            { href: '/', label: 'Dashboard' },
            { href: '/review', label: 'Review' },
            { href: '/rules', label: 'Rules' },
            { href: '/categories', label: 'Categories' },
            { href: '/statements', label: 'Statements' },
            { href: '/import', label: 'Import' },
          ].map((item) => (
            <a
              key={item.href}
              className="rounded-full px-3 py-1.5 bg-white/5 text-slate-100 hover:bg-white/10 transition"
              href={item.href}
            >
              {item.label}
            </a>
          ))}
          {authEnabled ? <LogoutButton /> : null}
        </nav>
      </header>
      {children}
    </div>
  );
}

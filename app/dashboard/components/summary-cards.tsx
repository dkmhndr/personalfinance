import { Card, CardContent, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { SummaryKPI } from '@/types';

type Props = {
  data: SummaryKPI | null;
  hide?: boolean;
};

export function SummaryCards({ data, hide }: Props) {
  const incomeNow = data?.totalIncome ?? 0;
  const incomePrev = (data as any)?.compareIncome ?? 0;
  const expenseNow = data?.totalExpense ?? 0;
  const expensePrev = (data as any)?.compareExpense ?? 0;

  const pct = (now: number, prev: number) => {
    if (!prev) return null;
    return ((now - prev) / prev) * 100;
  };

  const incomeDeltaPct = pct(incomeNow, incomePrev);
  const expenseDeltaPct = pct(expenseNow, expensePrev);

  const items = [
    {
      label: 'Total Income',
      value: data ? formatCurrency(data.totalIncome) : '—',
      deltaPct: incomeDeltaPct,
      goodIfUp: true,
      count: data?.incomeCount ?? 0,
    },
    {
      label: 'Total Expenses',
      value: data ? formatCurrency(data.totalExpense) : '—',
      deltaPct: expenseDeltaPct,
      goodIfUp: false,
      count: data?.expenseCount ?? 0,
    },
    { label: 'Net Cashflow', value: data ? formatCurrency(data.netCashflow) : '—' },
    {
      label: 'Avg Daily Spending',
      value: data && data.avgDailySpending !== undefined ? formatCurrency(data.avgDailySpending) : '—',
      blur: true,
    },
  ];
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => {
        const deltaClass =
          item.deltaPct === 0 || item.deltaPct === null || item.deltaPct === undefined
            ? 'text-muted'
            : item.deltaPct > 0 === (item.goodIfUp ?? true)
            ? 'text-emerald-400'
            : 'text-rose-400';
        const deltaText =
          item.deltaPct === 0 || item.deltaPct === null || item.deltaPct === undefined
            ? '—'
            : `${item.deltaPct > 0 ? '↑' : '↓'} ${Math.round(Math.abs(item.deltaPct))}%`;
        return (
          <Card key={item.label} className="h-full p-0">
            <CardContent className="flex h-full flex-col gap-1 p-4">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm text-muted">{item.label}</CardTitle>
                <div className="flex items-center gap-2">
                  {'count' in item && item.count !== undefined && item.count !== 0 && (
                    <span className="rounded-full bg-white/5 px-2 py-1 text-[11px] font-semibold text-muted">×{item.count}</span>
                  )}
                  {'deltaPct' in item && item.deltaPct !== undefined && item.deltaPct !== null && (
                    <span className={`rounded-full bg-white/5 px-2 py-1 text-xs font-semibold ${deltaClass}`}>{deltaText}</span>
                  )}
                </div>
              </div>
              <div
                className={`text-2xl font-semibold leading-tight ${
                  hide && item.label !== 'Transactions' ? 'blur-md select-none' : ''
                }`}
              >
                {item.value}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

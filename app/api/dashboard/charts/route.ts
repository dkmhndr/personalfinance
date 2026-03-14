import { NextRequest, NextResponse } from 'next/server';
import {
  fetchExpenseByCategory,
  fetchCashflowTrend,
  fetchDailySpending,
  fetchTopSpendingCategories,
} from '@/lib/queries';
import { supabaseAdmin } from '@/lib/supabase';
import { type DashboardFilters } from '@/types';

export const dynamic = 'force-dynamic';

function parseFilters(req: NextRequest): DashboardFilters {
  const params = req.nextUrl.searchParams;
  return {
    startDate: params.get('startDate') || undefined,
    endDate: params.get('endDate') || undefined,
    viewBy: (params.get('viewBy') as 'month' | 'year') || 'month',
    categoryId: params.get('categoryId') || undefined,
    source: (params.get('source') as any) || undefined,
    type: (params.get('type') as any) || undefined,
    minAmount: params.get('minAmount') ? Number(params.get('minAmount')) : undefined,
    maxAmount: params.get('maxAmount') ? Number(params.get('maxAmount')) : undefined,
    uncategorized: params.get('uncategorized') === 'true',
    bucket: (params.get('bucket') as 'day' | 'month') || undefined,
    compareStartDate: params.get('compareStartDate') || undefined,
    compareEndDate: params.get('compareEndDate') || undefined,
  };
}

function diffDays(startIso: string, endIso: string) {
  return Math.abs(new Date(endIso).getTime() - new Date(startIso).getTime()) / (1000 * 60 * 60 * 24);
}

function shiftMonths(iso: string, months: number) {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export async function GET(req: NextRequest) {
  const filters = parseFilters(req);

  const now = new Date();
  const [minRes, maxRes] = await Promise.all([
    supabaseAdmin
      .from('transactions')
      .select('transaction_at')
      .order('transaction_at', { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabaseAdmin
      .from('transactions')
      .select('transaction_at')
      .order('transaction_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const minDate = minRes.data?.transaction_at || new Date(now.getFullYear(), 0, 1).toISOString();
  const maxDate = maxRes.data?.transaction_at || now.toISOString();

  const rangeStart = filters.startDate || minDate;
  const rangeEnd = filters.endDate || maxDate;
  const hasExplicitRange = Boolean(filters.startDate && filters.endDate);
  const rangeDays = diffDays(rangeStart, rangeEnd);

  // Cashflow: if explicit range < 3 months, extend to 3 months; all-time remains all-time.
  const cashStart = hasExplicitRange && rangeDays < 92 ? shiftMonths(rangeEnd, -3) : rangeStart;
  const cashFilters: DashboardFilters = {
    ...filters,
    type: undefined,
    startDate: cashStart,
    endDate: rangeEnd,
    bucket: 'month',
  };

  // Spending: <= 3 months daily, > 3 months monthly.
  const spendBucket: 'day' | 'month' = rangeDays > 92 ? 'month' : 'day';
  const spendFilters: DashboardFilters = {
    ...filters,
    type: undefined,
    startDate: rangeStart,
    endDate: rangeEnd,
    bucket: spendBucket,
  };

  try {
    const [expenseByCategory, cashflow, daily, topCategories] = await Promise.all([
      fetchExpenseByCategory(spendFilters),
      fetchCashflowTrend(cashFilters),
      fetchDailySpending(spendFilters),
      fetchTopSpendingCategories(spendFilters),
    ]);

    return NextResponse.json({
      expenseByCategory,
      cashflow,
      daily,
      topCategories,
    });
  } catch (error: any) {
    console.error('dashboard charts api error', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

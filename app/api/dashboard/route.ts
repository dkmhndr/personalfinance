import { NextRequest, NextResponse } from 'next/server';
import {
  fetchSummary,
  fetchExpenseByCategory,
  fetchCashflowTrend,
  fetchTransactions,
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

export async function GET(req: NextRequest) {
  const filters = parseFilters(req);
  const page = Number(req.nextUrl.searchParams.get('page') || '1');
  const pageSize = Number(req.nextUrl.searchParams.get('pageSize') || '20');

  const now = new Date();
  // Find min/max to support all-time when no date filter
  const [minRes, maxRes] = await Promise.all([
    supabaseAdmin.from('transactions').select('transaction_at').order('transaction_at', { ascending: true }).limit(1).maybeSingle(),
    supabaseAdmin.from('transactions').select('transaction_at').order('transaction_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  const minDate = minRes.data?.transaction_at || new Date(now.getFullYear(), 0, 1).toISOString();
  const maxDate = maxRes.data?.transaction_at || now.toISOString();

  // Cashflow chart: show at least last 3 billing cycles (25th cutoff) even if filter narrower
  // 3 cycles back = 25th of (month - 3)
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 25).toISOString();
  const cashStart = filters.startDate ? filters.startDate : minDate;
  const cashEnd = filters.endDate ? filters.endDate : maxDate;
  const effectiveCashStart = new Date(cashStart) > new Date(threeMonthsAgo) ? threeMonthsAgo : cashStart;
  const cashFilters: DashboardFilters = {
    startDate: effectiveCashStart,
    endDate: cashEnd,
    viewBy: 'month',
    bucket: 'month',
  };

  // Spending chart follows date range (if provided), otherwise all-time; bucket auto by range
  const spendStart = filters.startDate || minDate;
  const spendEnd = filters.endDate || maxDate;
  const spendDiff =
    Math.abs(new Date(spendEnd).getTime() - new Date(spendStart).getTime()) / (1000 * 60 * 60 * 24);
  const spendBucket: 'day' | 'month' = spendDiff > 31 ? 'month' : 'day';
  const spendFilters: DashboardFilters = {
    startDate: spendStart,
    endDate: spendEnd,
    viewBy: 'month',
    bucket: spendBucket,
  };

  try {
    const [summary, expenseByCategory, cashflow, transactions, daily, topCategories] = await Promise.all([
      fetchSummary(filters),
      fetchExpenseByCategory(spendFilters),
      fetchCashflowTrend(cashFilters),
      fetchTransactions(filters, page, pageSize),
      fetchDailySpending(spendFilters),
      fetchTopSpendingCategories(spendFilters),
    ]);

    return NextResponse.json({
      summary,
      expenseByCategory,
      cashflow,
      daily,
      topCategories,
      transactions: transactions.data,
      totalTransactions: transactions.count,
    });
  } catch (error: any) {
    console.error('dashboard api error', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

import { supabaseAdmin } from './supabase';
import type { PostgrestSingleResponse } from '@supabase/supabase-js';
import { type DashboardFilters } from '@/types';

const baseSelect = '*, categories(*), accounts(name)';

const PAGE_SIZE = 1000; // PostgREST per-request cap is 1000 rows

function applyFilters(query: any, filters: DashboardFilters) {
  if (filters.startDate) query = query.gte('transaction_at', filters.startDate);
  if (filters.endDate) query = query.lte('transaction_at', filters.endDate);
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.source) query = query.eq('categorization_source', filters.source);
  if (filters.type) query = query.eq('type', filters.type);
  if (filters.minAmount !== undefined) query = query.gte('amount', filters.minAmount);
  if (filters.maxAmount !== undefined) query = query.lte('amount', filters.maxAmount);
  if (filters.uncategorized) query = query.is('category_id', null);
  return query;
}

/**
 * Fetch all rows by paging through the PostgREST 1000-row limit.
 * queryFactory must return a fresh builder for each page because range() mutates the builder.
 */
async function fetchAll<T = any>(
  queryFactory: (from: number, to: number) => PromiseLike<PostgrestSingleResponse<T[]>>,
): Promise<T[]> {
  let from = 0;
  const rows: T[] = [];
  while (true) {
    const to = from + PAGE_SIZE - 1;
    const { data, error } = await queryFactory(from, to);
    if (error) throw error;
    const batch = (data as T[]) || [];
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) break; // reached last page
    from += PAGE_SIZE;
  }
  return rows;
}

export async function fetchSummary(filters: DashboardFilters) {
  const data = await fetchAll<{ amount: number; type: string; transaction_at: string }>((from, to) =>
    applyFilters(
      supabaseAdmin.from('transactions').select('amount,type,transaction_at').range(from, to),
      filters,
    ),
  );
  const totalIncome = data.filter((d: any) => d.type === 'income').reduce((sum: number, d: any) => sum + Number(d.amount), 0);
  const totalExpense = data.filter((d: any) => d.type === 'expense').reduce((sum: number, d: any) => sum + Number(d.amount), 0);
  const incomeCount = data.filter((d: any) => d.type === 'income').length;
  const expenseCount = data.filter((d: any) => d.type === 'expense').length;

  // Avg daily spending based on expenses only
  let avgDailySpending = 0;
  try {
    const { data: spanData, error: spanErr } = await applyFilters(
      supabaseAdmin
        .from('transactions')
        .select('min_date:min(transaction_at),max_date:max(transaction_at),sum_expense:sum(amount)')
        .eq('type', 'expense'),
      { ...filters, type: 'expense' },
    ).maybeSingle();
    if (spanErr) throw spanErr;
    if (spanData?.min_date && spanData?.max_date) {
      const start = filters.startDate ? new Date(filters.startDate) : new Date(spanData.min_date);
      const end = filters.endDate ? new Date(filters.endDate) : new Date(spanData.max_date);
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      avgDailySpending = Number(spanData.sum_expense || 0) / days;
    }
  } catch {
    // fallback: derive from already-fetched expense data
    const expenseRows = data.filter((d) => d.type === 'expense');
    if (expenseRows.length > 0) {
      const minTs = Math.min(...expenseRows.map((d) => new Date(d.transaction_at).getTime()));
      const maxTs = Math.max(...expenseRows.map((d) => new Date(d.transaction_at).getTime()));
      const start = filters.startDate ? new Date(filters.startDate) : new Date(minTs);
      const end = filters.endDate ? new Date(filters.endDate) : new Date(maxTs);
      const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1);
      avgDailySpending = expenseRows.reduce((s, r) => s + Number(r.amount), 0) / days;
    }
  }

  // derive compare range: explicit provided or shift 1 year back
  const shiftYear = (iso: string, years: number) => {
    const d = new Date(iso);
    d.setFullYear(d.getFullYear() + years);
    return d.toISOString();
  };
  const compareStart =
    filters.compareStartDate || (filters.startDate ? shiftYear(filters.startDate, -1) : undefined);
  const compareEnd = filters.compareEndDate || (filters.endDate ? shiftYear(filters.endDate, -1) : undefined);

  let compareIncome = 0;
  let compareExpense = 0;
  if (compareStart || compareEnd) {
    const compFilters: DashboardFilters = {
      ...filters,
      startDate: compareStart,
      endDate: compareEnd,
    };
    const compData = await fetchAll<{ amount: number; type: string }>((from, to) =>
      applyFilters(
        supabaseAdmin.from('transactions').select('amount,type').range(from, to),
        compFilters,
      ),
    );
    compareIncome = compData.filter((d) => d.type === 'income').reduce((s, d) => s + Number(d.amount), 0);
    compareExpense = compData.filter((d) => d.type === 'expense').reduce((s, d) => s + Number(d.amount), 0);
  }

  return {
    totalIncome,
    totalExpense,
    netCashflow: totalIncome - totalExpense,
    count: incomeCount + expenseCount,
    compareIncome,
    compareExpense,
    avgDailySpending,
    incomeCount,
    expenseCount,
  };
}

export async function fetchExpenseByCategory(filters: DashboardFilters) {
  const expenseFilters: DashboardFilters = { ...filters, type: undefined };
  const data = await fetchAll<{ amount: number; categories: { name: string; type: string } | null }>((from, to) =>
    applyFilters(
      supabaseAdmin
        .from('transactions')
        .select('amount,categories(name,type)')
        .eq('type', 'expense')
        .range(from, to),
      expenseFilters,
    ),
  );
  const map: Record<string, number> = {};
  data.forEach((row: any) => {
    const name = row.categories?.name || 'Uncategorized';
    if (name === 'Transfer' || row.categories?.type === 'transfer') return;
    map[name] = (map[name] || 0) + Number(row.amount);
  });
  return Object.entries(map).map(([name, total]) => ({ name, total }));
}

export async function fetchCashflowTrend(filters: DashboardFilters) {
  // Aggregate directly from filtered transactions so the cashflow chart
  // always honors date/category/source/type filters consistently.
  const data = await fetchAll<{ amount: number; type: string; transaction_at: string }>((from, to) =>
    applyFilters(
      supabaseAdmin.from('transactions').select('amount,type,transaction_at').range(from, to),
      filters,
    ),
  );

  const map: Record<string, { income: number; expense: number }> = {};
  data.forEach((row) => {
    const key = row.transaction_at.slice(0, 7); // YYYY-MM
    if (!map[key]) map[key] = { income: 0, expense: 0 };
    if (row.type === 'income') map[key].income += Number(row.amount);
    if (row.type === 'expense') map[key].expense += Number(row.amount);
  });

  return Object.entries(map)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([period, { income, expense }]) => ({ period, income, expense }));
}

export async function fetchTransactions(filters: DashboardFilters, page = 1, pageSize = 20) {
  let query = supabaseAdmin.from('transactions').select(baseSelect, { count: 'exact' }).order('transaction_at', { ascending: false });
  query = applyFilters(query, filters);
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const { data, count, error } = await query.range(from, to);
  if (error) throw error;
  return { data, count: count || 0 };
}

export async function fetchDailySpending(filters: DashboardFilters) {
  const bucket = filters.bucket || 'day';
  const expenseFilters: DashboardFilters = { ...filters, type: undefined };
  const data = await fetchAll<{ amount: number; transaction_at: string; categories: { name: string; type: string } | null }>(
    (from, to) =>
      applyFilters(
        supabaseAdmin
          .from('transactions')
          .select('amount,transaction_at,categories(name,type)')
          .eq('type', 'expense')
          .range(from, to),
        expenseFilters,
      ),
  );
  const map: Record<string, number> = {};
  data.forEach((row: any) => {
    if (row.categories?.name === 'Transfer' || row.categories?.type === 'transfer') return;
    const iso = row.transaction_at;
    const key = bucket === 'month' ? iso.slice(0, 7) : iso.slice(0, 10); // slice to avoid tz shift
    map[key] = (map[key] || 0) + Number(row.amount);
  });
  return Object.entries(map)
    .sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([date, total]) => ({ date, total }));
}

export async function fetchTopSpendingCategories(filters: DashboardFilters, limit = 5) {
  const expenses = await fetchExpenseByCategory(filters);
  return expenses.sort((a, b) => b.total - a.total).slice(0, limit);
}

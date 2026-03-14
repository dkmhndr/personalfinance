"use client";

import { useEffect, useState } from "react";
import { SummaryCards } from "./summary-cards";
import {
  ExpenseDonut,
  CashflowTrend,
  DailySpendingBar,
  TopCategoriesBar,
} from "./charts";
import { TransactionsTable } from "./transactions-table";
import { FilterBar } from "./filter-bar";
import { SyncButton } from "@/components/sync-button";
import {
  type DashboardFilters,
  type Category,
  type Transaction,
  type SummaryKPI,
} from "@/types";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";

type DashboardResponse = {
  summary: SummaryKPI;
  expenseByCategory: { name: string; total: number }[];
  cashflow: { period: string; income: number; expense: number }[];
  daily: { date: string; total: number }[];
  topCategories: { name: string; total: number }[];
  transactions: Transaction[];
  totalTransactions: number;
};

type SummaryResponse = {
  summary: SummaryKPI;
  allTimeStartDate: string | null;
  allTimeEndDate: string | null;
};

type ChartsResponse = {
  expenseByCategory: { name: string; total: number }[];
  cashflow: { period: string; income: number; expense: number }[];
  daily: { date: string; total: number }[];
  topCategories: { name: string; total: number }[];
};

type TransactionsResponse = {
  transactions: Transaction[];
  totalTransactions: number;
};

const defaultFilters: DashboardFilters = {
  viewBy: "month",
  startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(),
  endDate: new Date().toISOString(),
  compareStartDate: new Date(new Date().getFullYear() - 1, 0, 1).toISOString(),
  compareEndDate: new Date(
    new Date().getFullYear() - 1,
    11,
    31,
    23,
    59,
    59,
    999,
  ).toISOString(),
  bucket: "month",
};

export function DashboardClient({ categories }: { categories: Category[] }) {
  const [filters, setFilters] = useState<DashboardFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [summary, setSummary] = useState<SummaryKPI | null>(null);
  const [charts, setCharts] = useState<ChartsResponse | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTransactions, setTotalTransactions] = useState(0);
  const [loadingOverview, setLoadingOverview] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [allTimeRange, setAllTimeRange] = useState<{
    startDate?: string;
    endDate?: string;
  }>({});

  const withBucket = (base: DashboardFilters): DashboardFilters => {
    if (base.startDate && base.endDate) {
      const diff = Math.abs(
        new Date(base.endDate).getTime() - new Date(base.startDate).getTime(),
      );
      const days = diff / (1000 * 60 * 60 * 24);
      return { ...base, bucket: days > 31 ? "month" : "day" };
    }
    // default for table/filters when none: keep month to match initial state
    return { ...base, bucket: "month" };
  };

  const buildQuery = (
    nextFilters: DashboardFilters,
    extra: Record<string, string> = {},
  ) => {
    const effectiveFilters = withBucket(nextFilters);
    return new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(effectiveFilters).filter(
          ([, v]) => v !== undefined && v !== null,
        ) as any,
      ),
      ...extra,
    });
  };

  const fetchOverview = async (nextFilters: DashboardFilters = filters) => {
    const qs = buildQuery(nextFilters);
    setLoadingOverview(true);
    try {
      const [summaryRes, chartsRes] = await Promise.all([
        fetch(`/api/dashboard/summary?${qs.toString()}`, { cache: "no-store" }),
        fetch(`/api/dashboard/charts?${qs.toString()}`, { cache: "no-store" }),
      ]);
      if (!summaryRes.ok || !chartsRes.ok) {
        console.error("dashboard overview fetch failed", summaryRes.status, chartsRes.status);
        return;
      }
      const summaryJson = (await summaryRes.json()) as SummaryResponse;
      const chartsJson = (await chartsRes.json()) as ChartsResponse;
      setSummary(summaryJson.summary);
      setAllTimeRange({
        startDate: summaryJson.allTimeStartDate || undefined,
        endDate: summaryJson.allTimeEndDate || undefined,
      });
      setCharts(chartsJson);
    } finally {
      setLoadingOverview(false);
    }
  };

  const fetchTransactionsPage = async (
    nextFilters: DashboardFilters = filters,
    nextPage = page,
  ) => {
    const qs = buildQuery(nextFilters, {
      page: String(nextPage),
      pageSize: "20",
    });
    setLoadingTransactions(true);
    try {
      const res = await fetch(`/api/dashboard/transactions?${qs.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) {
        console.error("dashboard transactions fetch failed", res.status);
        return;
      }
      const json = (await res.json()) as TransactionsResponse;
      setTransactions(json.transactions || []);
      setTotalTransactions(json.totalTransactions || 0);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    fetchOverview(withBucket(filters));
    fetchTransactionsPage(withBucket(filters), 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiltersChange = (next: DashboardFilters) => {
    setFilters(next);
    setPage(1);
    fetchOverview(next);
    fetchTransactionsPage(next, 1);
  };

  const handleSelectCategory = (name: string) => {
    const cat = categories.find((c) => c.name === name);
    if (cat)
      handleFiltersChange(withBucket({ ...filters, categoryId: cat.id }));
  };

  const handleSelectDate = (date: string) => {
    if (date.length === 7) {
      const [y, m] = date.split("-").map(Number);
      const start = new Date(Date.UTC(y, m - 1, 1));
      const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
      handleFiltersChange(
        withBucket({
          ...filters,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
      );
    } else {
      const start = new Date(date);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      handleFiltersChange(
        withBucket({
          ...filters,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
        }),
      );
    }
  };

  const handleManualChange = async (id: string, categoryId: string) => {
    // optimistic UI
    setTransactions((prev) =>
      prev
        .map((t) =>
          t.id === id
            ? {
                ...t,
                category_id: categoryId,
                categorization_source: "manual" as const,
              }
            : t,
        )
        // hide manual overrides if current filter is AI/none
        .filter((t) =>
          filters.source
            ? t.categorization_source === filters.source
            : true,
        ),
    );
    await fetch("/api/transactions/category", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: id, categoryId }),
    });
    fetchOverview(filters);
    fetchTransactionsPage(filters, page);
  };

  const totalPages = Math.max(1, Math.ceil(totalTransactions / 20));

  const skeletonCard = (
    <div className="glass h-28 animate-pulse rounded-xl bg-white/5" />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="rounded-lg border border-border px-3 py-1.5 hover:bg-white/5 flex items-center gap-2 text-sm"
            onClick={() => setHideAmounts((v) => !v)}
          >
            {hideAmounts ? <EyeOff size={16} /> : <Eye size={16} />}
            {hideAmounts ? "Show" : "Hide"} amounts
          </button>
          {/* <SyncButton onDone={() => fetchData()} /> */}
        </div>
      </div>

      <FilterBar
        categories={categories}
        onChange={(f) => handleFiltersChange(withBucket(f))}
        initial={filters}
        allTimeRange={allTimeRange}
      />

      {loadingOverview && !summary ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="glass h-24 animate-pulse rounded-xl bg-white/5"
            />
          ))}
        </div>
      ) : (
        <SummaryCards data={summary || null} hide={hideAmounts} />
      )}

      <div className="grid gap-3 lg:grid-cols-5">
        <div className="lg:col-span-2">
          {loadingOverview && !charts ? (
            skeletonCard
          ) : (
            <ExpenseDonut
              data={charts?.expenseByCategory || []}
              onSelectCategory={handleSelectCategory}
              hide={hideAmounts}
            />
          )}
        </div>
        <div className="lg:col-span-3">
          {loadingOverview && !charts ? (
            skeletonCard
          ) : (
            <CashflowTrend data={charts?.cashflow || []} hide={hideAmounts} />
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-1">
        {loadingOverview && !charts ? (
          skeletonCard
        ) : (
          <DailySpendingBar
            data={charts?.daily || []}
            onSelectDate={handleSelectDate}
            bucket={
              charts?.daily &&
              charts.daily.length > 0 &&
              charts.daily[0].date.length === 7
                ? "month"
                : "day"
            }
            hide={hideAmounts}
          />
        )}
      </div>

      <Card>
        <CardTitle className="mb-2">Transactions</CardTitle>
        <CardContent className="space-y-3">
          {loadingTransactions && <div className="text-sm text-muted">Loading…</div>}
          <TransactionsTable
            data={transactions}
            categories={categories}
            onManualChange={handleManualChange}
            hide={hideAmounts}
          />
          <div className="flex items-center justify-between text-sm text-muted">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                className="rounded border border-border px-3 py-1 disabled:opacity-50"
                disabled={page <= 1}
                onClick={() => {
                  const next = page - 1;
                  setPage(next);
                  fetchTransactionsPage(filters, next);
                }}
              >
                Prev
              </button>
              <button
                className="rounded border border-border px-3 py-1 disabled:opacity-50"
                disabled={page >= totalPages}
                onClick={() => {
                  const next = page + 1;
                  setPage(next);
                  fetchTransactionsPage(filters, next);
                }}
              >
                Next
              </button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

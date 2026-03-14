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
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);

  const withBucket = (base: DashboardFilters) => {
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

  const fetchData = async (nextFilters = filters, nextPage = page) => {
    const effectiveFilters = withBucket(nextFilters);
    setLoading(true);
    const qs = new URLSearchParams({
      ...Object.fromEntries(
        Object.entries(effectiveFilters).filter(
          ([, v]) => v !== undefined && v !== null,
        ) as any,
      ),
      page: String(nextPage),
      pageSize: "20",
    });
    const res = await fetch(`/api/dashboard?${qs.toString()}`);
    if (!res.ok) {
      console.error("dashboard fetch failed", res.status);
      setLoading(false);
      return;
    }
    const json = (await res.json()) as DashboardResponse;
    setData(json);
    setLoading(false);
  };

  useEffect(() => {
    fetchData(withBucket(filters));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFiltersChange = (next: DashboardFilters) => {
    setFilters(next);
    setPage(1);
    fetchData(next, 1);
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
    setData((prev) =>
      prev
        ? {
            ...prev,
            transactions: prev.transactions
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
          }
        : prev,
    );
    await fetch("/api/transactions/category", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transactionId: id, categoryId }),
    });
    fetchData();
  };

  const totalPages = data ? Math.ceil(data.totalTransactions / 20) : 1;

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
      />

      {loading && !data ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="glass h-24 animate-pulse rounded-xl bg-white/5"
            />
          ))}
        </div>
      ) : (
        <SummaryCards data={data?.summary || null} hide={hideAmounts} />
      )}

      <div className="grid gap-3 lg:grid-cols-5">
        <div className="lg:col-span-2">
          {loading && !data ? (
            skeletonCard
          ) : (
            <ExpenseDonut
              data={data?.expenseByCategory || []}
              onSelectCategory={handleSelectCategory}
              hide={hideAmounts}
            />
          )}
        </div>
        <div className="lg:col-span-3">
          {loading && !data ? (
            skeletonCard
          ) : (
            <CashflowTrend data={data?.cashflow || []} hide={hideAmounts} />
          )}
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-1">
        {loading && !data ? (
          skeletonCard
        ) : (
          <DailySpendingBar
            data={data?.daily || []}
            onSelectDate={handleSelectDate}
            bucket={
              data?.daily &&
              data.daily.length > 0 &&
              data.daily[0].date.length === 7
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
          {loading && <div className="text-sm text-muted">Loading…</div>}
          <TransactionsTable
            data={data?.transactions || []}
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
                  fetchData(filters, next);
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
                  fetchData(filters, next);
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

"use client";

import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { Eye, EyeOff, Copy, RefreshCw, Plus, Trash2, Save, Undo2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import {
  type BudgetLine,
  type BudgetSnapshot,
  type Category,
  type BudgetRecurrence,
} from "@/types";

type Props = {
  categories: Category[];
};

const formatPeriod = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;

const nextMonth = () => {
  const now = new Date();
  return formatPeriod(new Date(now.getFullYear(), now.getMonth() + 1, 1));
};

type DraftLine = {
  label: string;
  amount: string;
  category_id?: string;
  recurrence: BudgetRecurrence;
};

type BudgetUILine = BudgetLine & { amountInput?: string };

const tempId = () => `temp-${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function BudgetClient({ categories }: Props) {
  const [period, setPeriod] = useState<string>(nextMonth());
  const [scenario, setScenario] = useState<string>("Plan A");
  const [snapshot, setSnapshot] = useState<BudgetSnapshot | null>(null);
  const [lines, setLines] = useState<BudgetUILine[]>([]);
  const [baseLines, setBaseLines] = useState<BudgetUILine[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draftIncome, setDraftIncome] = useState<DraftLine>({
    label: "",
    amount: "",
    recurrence: "none",
  });
  const [draftExpense, setDraftExpense] = useState<DraftLine>({
    label: "",
    amount: "",
    category_id: "",
    recurrence: "none",
  });

  const incomeLines = useMemo(() => lines.filter((l) => l.type === "income"), [lines]);
  const expenseLines = useMemo(() => lines.filter((l) => l.type === "expense"), [lines]);

  const parseAmount = (l: { amount?: number; amountInput?: string }) => {
    const val = l.amountInput ?? l.amount?.toString() ?? "";
    const num = parseFloat(val);
    return Number.isFinite(num) ? num : 0;
  };

  const plannedTotals = useMemo(() => {
    const income = incomeLines.reduce((s, l) => s + parseAmount(l), 0);
    const expense = expenseLines.reduce((s, l) => s + parseAmount(l), 0);
    return { income, expense, net: income - expense };
  }, [incomeLines, expenseLines]);

  const normalizeLines = (items: BudgetUILine[]) =>
    items.map((l) => ({
      type: l.type,
      label: l.label,
      amount: Number(parseAmount(l)),
      recurrence: l.recurrence,
      category_id: l.category_id || null,
    }));

  const dirty =
    JSON.stringify(normalizeLines(lines)) !== JSON.stringify(normalizeLines(baseLines));

  const fetchSnapshot = async (nextPeriod = period, nextScenario = scenario) => {
    setLoading(true);
    setError(null);
    const qs = new URLSearchParams({ period: nextPeriod, scenario: nextScenario });
    const res = await fetch(`/api/budgets?${qs.toString()}`);
    if (!res.ok) {
      setError("Failed to load budget data.");
      setLoading(false);
      return;
    }
    const json = (await res.json()) as BudgetSnapshot;
    setSnapshot(json);
    const hydrated: BudgetUILine[] = (json.lines || []).map((l) => ({
      ...l,
      amountInput: l.amount != null ? l.amount.toString() : "",
    }));
    setLines(hydrated);
    setBaseLines(hydrated.map((l) => ({ ...l })));
    setLoading(false);
  };

  useEffect(() => {
    fetchSnapshot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAdd = (type: "income" | "expense") => {
    const draft = type === "income" ? draftIncome : draftExpense;
    const amountNum = Number(draft.amount);
    if (!draft.label || Number.isNaN(amountNum)) return;
    const newLine: BudgetUILine = {
      id: tempId(),
      period,
      scenario,
      type,
      label: draft.label,
      amount: amountNum,
      amountInput: draft.amount,
      category_id: type === "expense" ? draft.category_id || null : null,
      recurrence: draft.recurrence,
      created_at: new Date().toISOString(),
    };
    setLines((prev) => [...prev, newLine]);
    if (type === "income") {
      setDraftIncome({ label: "", amount: "", recurrence: "none" });
    } else {
      setDraftExpense({ label: "", amount: "", category_id: "", recurrence: "none" });
    }
  };

  const handleUpdateLine = (id: string, patch: Partial<BudgetUILine>) => {
    setLines((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  };

  const handleDeleteLocal = (id: string) => {
    setLines((prev) => prev.filter((l) => l.id !== id));
  };

  const handlePeriodChange = (value: string) => {
    if (!value) return;
    setPeriod(value);
    fetchSnapshot(value, scenario);
  };

  const handleScenarioChange = (value: string) => {
    const next = value || "base";
    setScenario(next);
    fetchSnapshot(period, next);
  };

  const copyLastMonth = async () => {
    const [y, m] = period.split("-").map(Number);
    const fromPeriod = formatPeriod(new Date(y, m - 1, 1));
    const qs = new URLSearchParams({ period: fromPeriod, scenario });
    const res = await fetch(`/api/budgets?${qs.toString()}`);
    if (!res.ok) {
      setError("Failed to copy last month.");
      return;
    }
    const json = (await res.json()) as BudgetSnapshot;
    const cloned: BudgetUILine[] = (json.lines || []).map((l) => ({
      ...l,
      id: tempId(),
      period,
      scenario,
      amountInput: l.amount != null ? l.amount.toString() : "",
    }));
    setLines(cloned);
  };

  const saveAll = async () => {
    setSaving(true);
    setError(null);
    const payload = lines.map((l) => {
      const amt = parseAmount(l);
      if (!Number.isFinite(amt)) throw new Error("Amount invalid");
      const base: any = {
        type: l.type,
        label: l.label,
        amount: amt,
        category_id: l.category_id || null,
        recurrence: l.recurrence,
      };
      if (l.id && !l.id.startsWith("temp-")) base.id = l.id;
      return base;
    });
    const res = await fetch("/api/budgets", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ period, scenario, lines: payload }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Failed to save budget.");
      return;
    }
    fetchSnapshot(period, scenario);
  };

  const resetLocal = () => setLines(baseLines.map((l) => ({ ...l })));

  const refCard = snapshot?.actual;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-wide text-brand-200">Plan</p>
          <h2 className="text-2xl font-semibold">Budget Planner</h2>
          <p className="text-sm text-muted">Plan scenarios, review totals, save.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {dirty ? <Badge className="bg-amber-500/20 text-amber-100">Unsaved changes</Badge> : null}
          <Button variant="outline" size="sm" onClick={() => setHideAmounts((v) => !v)}>
            {hideAmounts ? <EyeOff size={16} /> : <Eye size={16} />}
            {hideAmounts ? "Show" : "Hide"} amounts
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="items-start gap-2.5 lg:flex-row lg:items-center">
          <div className="flex gap-2.5 flex-1 flex-wrap">
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted">Period</div>
              <Input
                type="month"
                value={period}
                onChange={(e) => handlePeriodChange(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <div className="text-xs uppercase text-muted">Name</div>
              <Input
                value={scenario}
                onChange={(e) => handleScenarioChange(e.target.value)}
                className="w-40"
                placeholder="Plan name"
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="px-2 py-1"
              aria-label="Copy last month"
              onClick={copyLastMonth}
            >
              <Copy size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="px-2 py-1"
              aria-label="Reload"
              onClick={() => fetchSnapshot()}
            >
              <RefreshCw size={16} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="px-2 py-1"
              aria-label="Discard changes"
              onClick={resetLocal}
              disabled={!dirty}
            >
              <Undo2 size={16} />
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="px-2 py-1"
              aria-label="Save plan"
              onClick={saveAll}
              disabled={!dirty || saving}
            >
              {saving ? "…" : <Save size={16} />}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="grid gap-2.5 sm:grid-cols-3">
          <SummaryStat label="Planned Income" value={plannedTotals.income} hide={hideAmounts} />
          <SummaryStat label="Planned Expense" value={plannedTotals.expense} hide={hideAmounts} />
          <SummaryStat label="Net Cashflow" value={plannedTotals.net} hide={hideAmounts} />
          <ReferenceStat
            title="Actual (same period)"
            income={refCard?.income || 0}
            expense={refCard?.expense || 0}
            net={refCard?.net || 0}
            hide={hideAmounts}
          />
          <ReferenceStat
            title="Last month actual"
            income={refCard?.lastMonthIncome || 0}
            expense={refCard?.lastMonthExpense || 0}
            net={(refCard?.lastMonthIncome || 0) - (refCard?.lastMonthExpense || 0)}
            hide={hideAmounts}
          />
          <ReferenceStat
            title="3-mo avg actual"
            income={refCard?.last3AvgIncome || 0}
            expense={refCard?.last3AvgExpense || 0}
            net={(refCard?.last3AvgIncome || 0) - (refCard?.last3AvgExpense || 0)}
            hide={hideAmounts}
          />
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <LineCard
          title="Income plan"
          type="income"
          lines={incomeLines}
          categories={categories}
          draft={draftIncome}
          setDraft={setDraftIncome}
          onAdd={() => handleAdd("income")}
          onChangeLine={handleUpdateLine}
          onDeleteLocal={handleDeleteLocal}
        />
        <LineCard
          title="Expense plan"
          type="expense"
          lines={expenseLines}
          categories={categories}
          draft={draftExpense}
          setDraft={setDraftExpense}
          onAdd={() => handleAdd("expense")}
          onChangeLine={handleUpdateLine}
          onDeleteLocal={handleDeleteLocal}
          showCategory
        />
      </div>

      {loading && <div className="text-sm text-muted">Loading budgets…</div>}
      {error && <div className="text-sm text-rose-200">{error}</div>}
    </div>
  );
}

function SummaryStat({ label, value, hide }: { label: string; value: number; hide: boolean }) {
  return (
    <Card className="bg-white/5 h-full flex flex-col">
      <CardHeader className="flex-row items-center justify-between mb-0 pb-1">
        <CardTitle className="text-sm text-muted whitespace-nowrap">{label}</CardTitle>
        <Badge className={value >= 0 ? "bg-emerald-500/20 text-emerald-100" : "bg-rose-500/20 text-rose-50"}>
          {value >= 0 ? "Positive" : "Negative"}
        </Badge>
      </CardHeader>
      <CardContent className="flex-1 pt-0">
        <div className="text-2xl font-semibold">{hide ? "••••" : formatCurrency(value)}</div>
      </CardContent>
    </Card>
  );
}

function ReferenceStat({
  title,
  income,
  expense,
  net,
  hide,
}: {
  title: string;
  income: number;
  expense: number;
  net: number;
  hide: boolean;
}) {
  return (
    <Card className="bg-surface2/60 h-full flex flex-col">
      <CardHeader className="mb-0 pb-1">
        <CardTitle className="text-sm text-muted whitespace-nowrap">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 space-y-1 text-sm pt-0">
        <div className="flex items-center justify-between">
          <span>Income</span>
          <span className="text-emerald-200">{hide ? "••••" : formatCurrency(income)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span>Expense</span>
          <span className="text-rose-200">{hide ? "••••" : formatCurrency(expense)}</span>
        </div>
        <div className="flex items-center justify-between text-muted">
          <span>Net</span>
          <span>{hide ? "••••" : formatCurrency(net)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

type LineCardProps = {
  title: string;
  type: "income" | "expense";
  lines: BudgetUILine[];
  categories: Category[];
  draft: DraftLine;
  setDraft: Dispatch<SetStateAction<DraftLine>>;
  onAdd: () => void;
  onChangeLine: (id: string, patch: Partial<BudgetUILine>) => void;
  onDeleteLocal: (id: string) => void;
  showCategory?: boolean;
};

function LineCard({
  title,
  type,
  lines,
  categories,
  draft,
  setDraft,
  onAdd,
  onChangeLine,
  onDeleteLocal,
  showCategory = false,
}: LineCardProps) {
  return (
    <Card className="bg-white/5">
      <CardHeader className="mb-1 flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <Badge className={type === "income" ? "bg-emerald-500/20 text-emerald-100" : "bg-amber-500/20 text-amber-50"}>
          {lines.length} items
        </Badge>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        <div className="overflow-x-auto rounded-lg border border-border/60 bg-surface2/40">
          <Table className="[&_th]:px-2 [&_td]:px-2 [&_th]:py-2 [&_td]:py-2">
            <THead>
              <TR>
                <TH>Label</TH>
                {showCategory ? <TH>Category</TH> : null}
                <TH>Amount</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {lines.map((line) => (
                <BudgetRow
                  key={line.id}
                  line={line}
                  categories={categories}
                  showCategory={showCategory}
                  onChangeLine={onChangeLine}
                  onDeleteLocal={onDeleteLocal}
                />
              ))}
              <TR>
                <TD>
                  <Input
                    placeholder="Add label"
                    value={draft.label}
                    onChange={(e) => setDraft({ ...draft, label: e.target.value })}
                  />
                </TD>
                {showCategory ? (
                  <TD>
                    <Select
                      value={draft.category_id || ""}
                      onChange={(e) => setDraft({ ...draft, category_id: e.target.value })}
                    >
                      <option value="">(optional)</option>
                      {categories
                        .filter((c) => c.type === "expense")
                        .map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                    </Select>
                  </TD>
                ) : null}
                <TD>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="Amount"
                    value={draft.amount}
                    onChange={(e) => setDraft({ ...draft, amount: e.target.value })}
                  />
                </TD>
                <TD>
                  <Button
                    variant="primary"
                    size="sm"
                    className="px-2 py-1"
                    aria-label="Add line"
                    onClick={onAdd}
                    disabled={!draft.label || !draft.amount}
                  >
                    <Plus size={16} />
                  </Button>
                </TD>
              </TR>
            </TBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

function BudgetRow({
  line,
  categories,
  showCategory,
  onChangeLine,
  onDeleteLocal,
}: {
  line: BudgetUILine;
  categories: Category[];
  showCategory?: boolean;
  onChangeLine: (id: string, patch: Partial<BudgetUILine>) => void;
  onDeleteLocal: (id: string) => void;
}) {
  return (
    <TR>
      <TD>
        <Input value={line.label} onChange={(e) => onChangeLine(line.id, { label: e.target.value })} />
      </TD>
      {showCategory ? (
        <TD>
          <Select
            value={line.category_id || ""}
            onChange={(e) => onChangeLine(line.id, { category_id: e.target.value || null })}
          >
            <option value="">(none)</option>
            {categories
              .filter((c) => c.type === "expense")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </Select>
        </TD>
      ) : null}
      <TD>
        <Input
          type="number"
          inputMode="decimal"
          value={line.amountInput ?? (line.amount != null ? String(line.amount) : "")}
          onChange={(e) =>
            onChangeLine(line.id, {
              amountInput: e.target.value,
              amount: e.target.value === "" ? 0 : Number(e.target.value),
            })
          }
        />
      </TD>
      <TD className="flex items-center gap-2 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="px-2 py-1"
          aria-label="Delete line"
          onClick={() => onDeleteLocal(line.id)}
        >
          <Trash2 size={16} />
        </Button>
      </TD>
    </TR>
  );
}

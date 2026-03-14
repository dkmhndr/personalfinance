import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { periodString } from './utils';
import { type BudgetSnapshot } from '@/types';

export const dynamic = 'force-dynamic';

function monthBounds(period: string) {
  const [y, m] = period.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  return { start, end };
}

async function sumAmount(type: 'income' | 'expense', start: Date, end: Date) {
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('amount')
    .eq('type', type)
    .gte('transaction_at', start.toISOString())
    .lte('transaction_at', end.toISOString());
  if (error) throw error;
  const rows = data || [];
  return rows.reduce((s: number, row: any) => s + Number(row.amount || 0), 0);
}

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const period = params.get('period') || periodString();
  const scenario = params.get('scenario') || 'base';

  const { start, end } = monthBounds(period);

  try {
    const { data: lines, error } = await supabaseAdmin
      .from('budget_lines')
      .select('*, categories(name,type)')
      .eq('period', period)
      .eq('scenario', scenario)
      .order('type', { ascending: false })
      .order('created_at', { ascending: true });
    if (error) throw error;

    const plannedIncome = (lines || []).filter((l) => l.type === 'income').reduce((s, l) => s + Number(l.amount), 0);
    const plannedExpense = (lines || []).filter((l) => l.type === 'expense').reduce((s, l) => s + Number(l.amount), 0);
    const snapshot: BudgetSnapshot = {
      lines: lines || [],
      totals: {
        plannedIncome,
        plannedExpense,
        netPlanned: plannedIncome - plannedExpense,
      },
      actual: {
        income: 0,
        expense: 0,
        net: 0,
        lastMonthIncome: 0,
        lastMonthExpense: 0,
        last3AvgIncome: 0,
        last3AvgExpense: 0,
      },
    };

    // actuals for the same period (informational only)
    const [actualIncome, actualExpense] = await Promise.all([
      sumAmount('income', start, end),
      sumAmount('expense', start, end),
    ]);
    snapshot.actual.income = actualIncome;
    snapshot.actual.expense = actualExpense;
    snapshot.actual.net = actualIncome - actualExpense;

    // last month actuals
    const prevStart = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 1, 1));
    const prevEnd = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0, 23, 59, 59, 999));
    const [prevIncome, prevExpense] = await Promise.all([
      sumAmount('income', prevStart, prevEnd),
      sumAmount('expense', prevStart, prevEnd),
    ]);
    snapshot.actual.lastMonthIncome = prevIncome;
    snapshot.actual.lastMonthExpense = prevExpense;

    // last 3 months average (exclude current period)
    const last3Start = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() - 3, 1));
    const last3End = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 0, 23, 59, 59, 999));
    const [last3Income, last3Expense] = await Promise.all([
      sumAmount('income', last3Start, last3End),
      sumAmount('expense', last3Start, last3End),
    ]);
    snapshot.actual.last3AvgIncome = last3Income / 3;
    snapshot.actual.last3AvgExpense = last3Expense / 3;

    return NextResponse.json(snapshot);
  } catch (err: any) {
    console.error('budget GET error', err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const period = body.period || periodString();
  const scenario = body.scenario || 'base';
  const type = body.type;
  const label = body.label;
  const amount = Number(body.amount);
  const recurrence = body.recurrence || 'none';
  const categoryId = body.categoryId || body.category_id || null;
  const id = body.id;

  if (!['income', 'expense', 'transfer'].includes(type)) {
    return NextResponse.json({ message: 'type must be income, expense, or transfer' }, { status: 400 });
  }
  if (!label || Number.isNaN(amount)) {
    return NextResponse.json({ message: 'label and amount required' }, { status: 400 });
  }

  const payload = {
    period,
    scenario,
    type,
    label,
    amount,
    recurrence,
    category_id: categoryId,
  };

  try {
    if (id) {
      const { error } = await supabaseAdmin.from('budget_lines').update(payload).eq('id', id);
      if (error) throw error;
      return NextResponse.json({ id });
    }
    const { data, error } = await supabaseAdmin.from('budget_lines').insert(payload).select('id').single();
    if (error) throw error;
    return NextResponse.json({ id: data?.id });
  } catch (err: any) {
    console.error('budget POST error', err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const period = body.period || periodString();
  const scenario = body.scenario || 'base';
  const rawLines = Array.isArray(body.lines) ? body.lines : [];

  const sanitize = (line: any) => {
    if (!['income', 'expense', 'transfer'].includes(line.type)) {
      throw new Error('type must be income, expense, or transfer');
    }
    if (!line.label || line.amount === undefined || line.amount === null) {
      throw new Error('line requires label and amount');
    }
    const base = {
      period,
      scenario,
      type: line.type,
      category_id: line.category_id || null,
      label: line.label,
      amount: Number(line.amount),
      recurrence: line.recurrence || 'none',
    };
    if (line.id) (base as any).id = line.id;
    return base;
  };

  try {
    const payload = rawLines.map(sanitize);

    const { error: delErr } = await supabaseAdmin
      .from('budget_lines')
      .delete()
      .eq('period', period)
      .eq('scenario', scenario);
    if (delErr) throw delErr;

    if (payload.length > 0) {
      const { error: insErr } = await supabaseAdmin.from('budget_lines').insert(payload);
      if (insErr) throw insErr;
    }

    return NextResponse.json({ count: payload.length });
  } catch (err: any) {
    console.error('budget PUT error', err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

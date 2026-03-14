import { NextRequest, NextResponse } from 'next/server';
import { v4 as uuid } from 'uuid';
import { supabaseAdmin } from '@/lib/supabase';
import { periodString } from '../route';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const fromPeriod = body.fromPeriod;
  const toPeriod = body.toPeriod || periodString();
  const scenario = body.scenario || 'base';
  const overwrite = body.overwrite || false;

  if (!fromPeriod) {
    return NextResponse.json({ message: 'fromPeriod required' }, { status: 400 });
  }

  try {
    const { data: existing, error: existingErr } = await supabaseAdmin
      .from('budget_lines')
      .select('id')
      .eq('period', toPeriod)
      .eq('scenario', scenario)
      .limit(1);
    if (existingErr) throw existingErr;
    if (existing && existing.length > 0 && !overwrite) {
      return NextResponse.json({ message: 'target period already has budget lines' }, { status: 409 });
    }

    const { data: source, error: sourceErr } = await supabaseAdmin
      .from('budget_lines')
      .select('*')
      .eq('period', fromPeriod)
      .eq('scenario', scenario);
    if (sourceErr) throw sourceErr;
    if (!source || source.length === 0) {
      return NextResponse.json({ message: 'no source lines' }, { status: 404 });
    }

    const payload = source.map((line) => ({
      id: uuid(),
      period: toPeriod,
      scenario,
      type: line.type,
      category_id: line.category_id,
      label: line.label,
      amount: line.amount,
      recurrence: line.recurrence,
    }));

    const { error: insertErr } = await supabaseAdmin.from('budget_lines').insert(payload);
    if (insertErr) throw insertErr;

    return NextResponse.json({ count: payload.length });
  } catch (err: any) {
    console.error('budget copy error', err);
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}

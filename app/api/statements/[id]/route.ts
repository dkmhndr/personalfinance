import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { categorizeRecord, mapBankType, loadDictionaries } from '@/lib/categorization';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { data, error } = await supabaseAdmin.from('bank_jago_statements').select('*').eq('id', id).maybeSingle();
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ message: 'Not found' }, { status: 404 });
  const { data: tx } = await supabaseAdmin.from('transactions').select('*').eq('source_id', id).maybeSingle();
  return NextResponse.json({ statement: data, transaction: tx });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await req.json();

  // 1) Update raw statement
  const { error: updErr, data: updated } = await supabaseAdmin
    .from('bank_jago_statements')
    .update({
      amount: body.amount,
      balance: body.balance ?? null,
      remark: body.remark ?? null,
      from_or_to: body.from_or_to ?? null,
      type: body.type ?? null,
      transaction_at: body.transaction_at ?? null,
    })
    .eq('id', id)
    .select()
    .maybeSingle();
  if (updErr) return NextResponse.json({ message: updErr.message }, { status: 500 });
  if (!updated) return NextResponse.json({ message: 'Not found' }, { status: 404 });

  // 2) Rebuild normalized transaction for this source
  const { data: account } = await supabaseAdmin.from('accounts').select('id').eq('name', 'Main Account').maybeSingle();
  const { data: fallback } = await supabaseAdmin.from('categories').select('id').eq('name', 'Other').maybeSingle();

  // Remove old normalized row
  await supabaseAdmin.from('transactions').delete().eq('source_id', id);

  const description = `${updated.remark || ''} ${updated.from_or_to || ''}`.trim();
  const type = mapBankType(updated.type, description);
  const dictionaries = await loadDictionaries();
  const cat = await categorizeRecord(
    description,
    Math.abs(Number(updated.amount)),
    type,
    fallback?.id || null,
    0.55,
    dictionaries,
    true,
  );

  const { error: insErr } = await supabaseAdmin.from('transactions').insert({
    id: crypto.randomUUID(),
    source_id: id,
    account_id: account?.id,
    transaction_at: updated.transaction_at || updated.created_at,
    description,
    amount: Math.abs(Number(updated.amount)),
    type,
    balance: updated.balance,
    category_id: cat.categoryId,
    categorization_source: cat.source,
  });
  if (insErr) return NextResponse.json({ message: insErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

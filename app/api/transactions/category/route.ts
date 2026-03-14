import { NextRequest, NextResponse } from 'next/server';
import { overrideTransactionCategory } from '@/lib/sync';
import { supabaseAdmin } from '@/lib/supabase';
import { normalizeDescription } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest) {
  const body = await req.json();
  if (!body.transactionId || !body.categoryId) {
    return NextResponse.json({ message: 'transactionId and categoryId are required' }, { status: 400 });
  }
  try {
    await overrideTransactionCategory(body.transactionId, body.categoryId);

    // Learn: add a precise rule using normalized description so future syncs auto-categorize
    const { data: tx } = await supabaseAdmin
      .from('transactions')
      .select('description')
      .eq('id', body.transactionId)
      .maybeSingle();
    if (tx?.description) {
      const keyword = normalizeDescription(tx.description).slice(0, 80); // cap length
      if (keyword.length > 2) {
        const { data: existing } = await supabaseAdmin.from('rules').select('id').eq('keyword', keyword).maybeSingle();
        if (!existing) {
          await supabaseAdmin.from('rules').insert({
            keyword,
            category_id: body.categoryId,
            priority: 5, // high priority
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

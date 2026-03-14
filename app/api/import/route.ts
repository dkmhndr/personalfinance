import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { syncBankStatements } from '@/lib/sync';

type RawRow = {
  id?: number | string;
  transaction_at?: string;
  from_or_to?: string;
  remark?: string;
  type?: string;
  amount?: number;
  balance?: number;
};

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.rows || !Array.isArray(body.rows)) {
    return NextResponse.json({ message: 'rows array required' }, { status: 400 });
  }

  const rows: RawRow[] = body.rows;

  // Normalize rows and generate ids if missing
  const normalized = rows.map((r, idx) => {
    const id =
      typeof r.id === 'number'
        ? r.id
        : typeof r.id === 'string' && r.id.trim()
        ? Number(BigInt.asUintN(63, BigInt(Math.abs(parseInt(r.id, 10) || 0))))
        : Date.now() + idx;
    return {
      id,
      created_at: new Date().toISOString(),
      transaction_at: r.transaction_at || r.created_at || new Date().toISOString(),
      from_or_to: r.from_or_to || '',
      remark: r.remark || '',
      type: r.type?.toLowerCase() === 'cr' || r.type?.toLowerCase() === 'credit' ? 'cr' : 'db',
      amount: Number(r.amount) || 0,
      balance: r.balance !== undefined ? Number(r.balance) : null,
    };
  });

  // Upsert into raw table
  const { error } = await supabaseAdmin.from('bank_jago_statements').upsert(normalized, { onConflict: 'id' });
  if (error) {
    return NextResponse.json({ message: error.message }, { status: 500 });
  }

  // Run sync to normalized transactions
  const syncResult = await syncBankStatements();

  return NextResponse.json({ ok: true, insertedRaw: normalized.length, sync: syncResult });
}

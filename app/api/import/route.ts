import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { syncBankStatements } from '@/lib/sync';

type RawRow = {
  id?: number | string;
  transaction_at?: string;
  created_at?: string;
  from_or_to?: string;
  remark?: string;
  type?: string;
  amount?: number;
  balance?: number;
};

export const dynamic = 'force-dynamic';

function toSafeId(value: RawRow['id']): number | null {
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return null;
    const normalized = Math.trunc(Math.abs(value));
    return normalized > 0 ? normalized : null;
  }

  if (typeof value === 'string' && value.trim()) {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) return null;

    try {
      const asBigInt = BigInt(trimmed);
      const normalized = BigInt.asUintN(63, asBigInt < 0n ? -asBigInt : asBigInt);
      const maxSafe = BigInt(Number.MAX_SAFE_INTEGER);
      if (normalized === 0n || normalized > maxSafe) {
        return null;
      }
      return Number(normalized);
    } catch {
      return null;
    }
  }

  return null;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.rows || !Array.isArray(body.rows)) {
    return NextResponse.json({ message: 'rows array required' }, { status: 400 });
  }

  const rows: RawRow[] = body.rows;
  const shouldSync = body.sync !== false;
  const usedIds = new Set<number>();
  const idSeed = Date.now();

  // Normalize rows and generate ids if missing
  const normalized = rows.map((r, idx) => {
    let id = toSafeId(r.id) ?? idSeed + idx;
    while (usedIds.has(id)) {
      id += 1;
    }
    usedIds.add(id);

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

  // Optionally run sync to normalized transactions
  const syncResult = shouldSync ? await syncBankStatements() : null;

  return NextResponse.json({ ok: true, insertedRaw: normalized.length, sync: syncResult, synced: shouldSync });
}

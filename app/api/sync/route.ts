import { NextResponse } from 'next/server';
import { syncBankStatements } from '@/lib/sync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await syncBankStatements();
    return NextResponse.json({ ok: true, ...result });
  } catch (error: any) {
    console.error('sync error', error);
    const message = error?.message || (typeof error === 'string' ? error : JSON.stringify(error));
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

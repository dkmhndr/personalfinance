import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const limit = Number(params.get('limit') || '50');
  const { data, error } = await supabaseAdmin
    .from('transactions')
    .select('*, categories(*)')
    .in('categorization_source', ['ai', 'none'])
    .order('transaction_at', { ascending: false })
    .limit(limit);
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

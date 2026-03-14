import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin.from('rules').select('*, categories(*)').order('priority', { ascending: true });
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.keyword || !body.category_id) {
    return NextResponse.json({ message: 'keyword and category_id required' }, { status: 400 });
  }
  const { error } = await supabaseAdmin.from('rules').insert({
    keyword: body.keyword.toUpperCase(),
    min_amount: body.min_amount ?? null,
    max_amount: body.max_amount ?? null,
    category_id: body.category_id,
    priority: body.priority ?? 100,
  });
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

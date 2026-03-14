import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { data, error } = await supabaseAdmin.from('categories').select('*').order('name');
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.type) return NextResponse.json({ message: 'name and type required' }, { status: 400 });
  const { error } = await supabaseAdmin.from('categories').insert({
    id: body.id,
    name: body.name,
    type: body.type,
  });
  if (error) return NextResponse.json({ message: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

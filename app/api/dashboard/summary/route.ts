import { NextRequest, NextResponse } from 'next/server';
import { fetchSummary } from '@/lib/queries';
import { supabaseAdmin } from '@/lib/supabase';
import { type DashboardFilters } from '@/types';

export const dynamic = 'force-dynamic';

function parseFilters(req: NextRequest): DashboardFilters {
  const params = req.nextUrl.searchParams;
  return {
    startDate: params.get('startDate') || undefined,
    endDate: params.get('endDate') || undefined,
    viewBy: (params.get('viewBy') as 'month' | 'year') || 'month',
    categoryId: params.get('categoryId') || undefined,
    source: (params.get('source') as any) || undefined,
    type: (params.get('type') as any) || undefined,
    minAmount: params.get('minAmount') ? Number(params.get('minAmount')) : undefined,
    maxAmount: params.get('maxAmount') ? Number(params.get('maxAmount')) : undefined,
    uncategorized: params.get('uncategorized') === 'true',
    bucket: (params.get('bucket') as 'day' | 'month') || undefined,
    compareStartDate: params.get('compareStartDate') || undefined,
    compareEndDate: params.get('compareEndDate') || undefined,
  };
}

export async function GET(req: NextRequest) {
  const filters = parseFilters(req);

  try {
    const [summary, minRes, maxRes] = await Promise.all([
      fetchSummary(filters),
      supabaseAdmin
        .from('transactions')
        .select('transaction_at')
        .order('transaction_at', { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabaseAdmin
        .from('transactions')
        .select('transaction_at')
        .order('transaction_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    return NextResponse.json({
      summary,
      allTimeStartDate: minRes.data?.transaction_at || null,
      allTimeEndDate: maxRes.data?.transaction_at || null,
    });
  } catch (error: any) {
    console.error('dashboard summary api error', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

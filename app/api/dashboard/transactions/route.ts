import { NextRequest, NextResponse } from 'next/server';
import { fetchTransactions } from '@/lib/queries';
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
  const page = Number(req.nextUrl.searchParams.get('page') || '1');
  const pageSize = Number(req.nextUrl.searchParams.get('pageSize') || '20');

  try {
    const transactions = await fetchTransactions(filters, page, pageSize);
    return NextResponse.json({
      transactions: transactions.data,
      totalTransactions: transactions.count,
    });
  } catch (error: any) {
    console.error('dashboard transactions api error', error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}

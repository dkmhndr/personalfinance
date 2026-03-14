import { supabaseAdmin } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDate } from '@/lib/utils';
import StatementDetailClient from '../statement-detail-client';

export const revalidate = 0;

export default async function StatementDetail({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const { data, error } = await supabaseAdmin.from('bank_jago_statements').select('*').eq('id', id).maybeSingle();
  if (error || !data) {
    return (
      <main className="space-y-4">
        <div className="text-sm text-rose-400">Not found</div>
      </main>
    );
  }
  const { data: tx } = await supabaseAdmin.from('transactions').select('*').eq('source_id', id).maybeSingle();

  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Statement #{id}</h1>
        <p className="text-sm text-muted">Raw + normalized view.</p>
      </div>

      <StatementDetailClient initial={data} />

      <Card>
        <CardHeader>
          <CardTitle>Normalized Transaction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {tx ? (
            <>
              <div>Date: {formatDate(tx.transaction_at)}</div>
              <div>Description: {tx.description}</div>
              <div>Type: {tx.type}</div>
              <div>Amount: {formatCurrency(Number(tx.amount))}</div>
              <div>Category: {tx.category_id || 'Uncategorized'}</div>
              <div>Source: {tx.categorization_source}</div>
            </>
          ) : (
            <div className="text-muted">No normalized transaction (yet).</div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

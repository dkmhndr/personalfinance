import { supabaseAdmin } from '@/lib/supabase';
import StatementsClient from './statements-client';

export const revalidate = 0;

export default async function StatementsPage() {
  const { data } = await supabaseAdmin
    .from('bank_jago_statements')
    .select('*')
    .order('transaction_at', { ascending: false })
    .limit(300);

  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Raw Statements</h1>
        <p className="text-sm text-muted">Adjust amounts, remarks, or types if parsing is incorrect; normalized transactions re-sync automatically.</p>
      </div>
      <StatementsClient initial={data || []} />
    </main>
  );
}

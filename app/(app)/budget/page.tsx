import { supabaseAdmin } from '@/lib/supabase';
import BudgetClient from './budget-client';

export const revalidate = 0;

export default async function BudgetPage() {
  const { data: categories } = await supabaseAdmin.from('categories').select('*').order('name');

  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Budget</h1>
        <p className="text-sm text-muted">Plan budgets, compare scenarios, save.</p>
      </div>
      <BudgetClient categories={categories || []} />
    </main>
  );
}

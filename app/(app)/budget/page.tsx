import { supabaseAdmin } from '@/lib/supabase';
import BudgetClient from './budget-client';

export const revalidate = 0;

export default async function BudgetPage() {
  const { data: categories } = await supabaseAdmin.from('categories').select('*').order('name');

  return (
    <main className="space-y-4">
      <BudgetClient categories={categories || []} />
    </main>
  );
}

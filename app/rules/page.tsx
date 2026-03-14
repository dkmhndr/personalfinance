import { supabaseAdmin } from '@/lib/supabase';
import RulesClient from './rules-client';

export const revalidate = 0;

export default async function RulesPage() {
  const { data: categories } = await supabaseAdmin.from('categories').select('*').order('name');
  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Rules</h1>
        <p className="text-sm text-muted">Keyword + amount bounds + priority.</p>
      </div>
      <RulesClient categories={categories || []} />
    </main>
  );
}

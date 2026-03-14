import { supabaseAdmin } from '@/lib/supabase';
import { DashboardClient } from './dashboard/components/dashboard-client';

export const revalidate = 0;

export default async function Page() {
  const { data: categories } = await supabaseAdmin.from('categories').select('*').order('name');

  return (
    <main className="space-y-4">
      <DashboardClient categories={categories || []} />
    </main>
  );
}

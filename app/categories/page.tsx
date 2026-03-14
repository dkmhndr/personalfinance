import { supabaseAdmin } from '@/lib/supabase';
import CategoriesClient from './categories-client';

export const revalidate = 0;

export default async function CategoriesPage() {
  const { data: categories } = await supabaseAdmin.from('categories').select('*').order('name');
  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Categories</h1>
        <p className="text-sm text-muted">Create, rename, or change type.</p>
      </div>
      <CategoriesClient initial={categories || []} />
    </main>
  );
}

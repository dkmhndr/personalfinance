import { supabaseAdmin } from '@/lib/supabase';
import { Category } from '@/types';
import ReviewClient from './review-client';

export const revalidate = 0;

export default async function ReviewPage() {
  const { data: categories } = await supabaseAdmin.from('categories').select('*').order('name');
  return (
    <main className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Review AI / Uncategorized</h1>
        <p className="text-sm text-muted">Verify low-confidence transactions and override categories.</p>
      </div>
      <ReviewClient categories={(categories || []) as Category[]} />
    </main>
  );
}

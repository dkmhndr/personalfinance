'use client';

import { useEffect, useState } from 'react';
import { Category } from '@/types';
import { TransactionsTable } from '../../dashboard/components/transactions-table';

type Props = {
  categories: Category[];
};

export default function ReviewClient({ categories }: Props) {
  const [transactions, setTransactions] = useState<any[]>([]);

  const load = async () => {
    const res = await fetch('/api/review');
    const data = await res.json();
    setTransactions(data);
  };

  const handleManual = async (id: string, categoryId: string) => {
    // optimistic remove from review list (manual items shouldn’t stay here)
    setTransactions((prev) => prev.filter((t) => t.id !== id));
    try {
      await fetch('/api/transactions/category', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transactionId: id, categoryId }),
      });
    } catch (e) {
      // fallback: reload if PATCH fails
      load();
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-3">
      <TransactionsTable data={transactions} categories={categories} onManualChange={handleManual} />
    </div>
  );
}

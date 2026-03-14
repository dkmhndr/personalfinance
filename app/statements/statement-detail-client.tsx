'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { format } from 'date-fns';

type RawStatement = {
  id: number;
  transaction_at: string | null;
  from_or_to: string | null;
  remark: string | null;
  type: string | null;
  amount: number | null;
  balance: number | null;
  created_at?: string | null;
};

export default function StatementDetailClient({ initial }: { initial: RawStatement }) {
  const [row, setRow] = useState<RawStatement>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const res = await fetch(`/api/statements/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) {
      setMessage(data.message || 'Failed to save');
      return;
    }
    setMessage('Saved & re-synced');
  };

  const update = (key: keyof RawStatement, val: any) => setRow((prev) => ({ ...prev, [key]: val }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Raw Statement</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {message && <div className="text-emerald-300">{message}</div>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <div className="text-muted text-xs">Date</div>
            <Input
              type="datetime-local"
              value={row.transaction_at ? format(new Date(row.transaction_at), "yyyy-MM-dd'T'HH:mm") : ''}
              onChange={(e) => update('transaction_at', e.target.value || null)}
            />
          </label>
          <label className="space-y-1">
            <div className="text-muted text-xs">Type (cr/db)</div>
            <Input value={row.type || ''} onChange={(e) => update('type', e.target.value)} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <div className="text-muted text-xs">Remark</div>
            <Input value={row.remark || ''} onChange={(e) => update('remark', e.target.value)} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <div className="text-muted text-xs">From / To</div>
            <Input value={row.from_or_to || ''} onChange={(e) => update('from_or_to', e.target.value)} />
          </label>
          <label className="space-y-1">
            <div className="text-muted text-xs">Amount</div>
            <Input
              type="number"
              value={row.amount ?? ''}
              onChange={(e) => update('amount', e.target.value ? Number(e.target.value) : null)}
            />
          </label>
          <label className="space-y-1">
            <div className="text-muted text-xs">Balance</div>
            <Input
              type="number"
              value={row.balance ?? ''}
              onChange={(e) => update('balance', e.target.value ? Number(e.target.value) : null)}
            />
          </label>
        </div>
        <Button onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save & Re-sync'}
        </Button>
      </CardContent>
    </Card>
  );
}

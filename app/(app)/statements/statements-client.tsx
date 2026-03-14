'use client';

import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, THead, TBody, TR, TH, TD } from '@/components/ui/table';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

type RawStatement = {
  id: number;
  transaction_at: string | null;
  from_or_to: string | null;
  remark: string | null;
  type: string | null;
  amount: number | null;
  balance: number | null;
};

export default function StatementsClient({ initial }: { initial: RawStatement[] }) {
  const [rows, setRows] = useState<RawStatement[]>(initial);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<'date' | 'amount'>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const router = useRouter();

  const filtered = useMemo(() => {
    return rows
      .filter((r) => {
        const hay = `${r.remark || ''} ${r.from_or_to || ''}`.toLowerCase();
        const okSearch = !search || hay.includes(search.toLowerCase());
        const okType = !typeFilter || (r.type || '').toLowerCase() === typeFilter;
        return okSearch && okType;
      })
      .sort((a, b) => {
        if (sortBy === 'date') {
          const da = a.transaction_at ? new Date(a.transaction_at).getTime() : 0;
          const db = b.transaction_at ? new Date(b.transaction_at).getTime() : 0;
          return sortDir === 'asc' ? da - db : db - da;
        }
        const aa = a.amount || 0;
        const bb = b.amount || 0;
        return sortDir === 'asc' ? aa - bb : bb - aa;
      });
  }, [rows, search, typeFilter, sortBy, sortDir]);

  const save = async (row: RawStatement) => {
    setSavingId(row.id);
    setMessage(null);
    const res = await fetch(`/api/statements/${row.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(row),
    });
    const data = await res.json().catch(() => ({}));
    setSavingId(null);
    if (!res.ok) {
      setMessage(data.message || 'Failed to save');
      return;
    }
    setMessage('Saved & re-synced');
  };

  const updateField = (id: number, key: keyof RawStatement, value: any) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [key]: value } : r)));
  };

  return (
    <div className="space-y-3 glass p-4">
      {message && <div className="text-sm text-emerald-300">{message}</div>}
      <div className="grid gap-3 sm:grid-cols-4">
        <Input placeholder="Search remark / from_to" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Input
          placeholder="Type filter (cr/db)"
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value.toLowerCase())}
        />
        <div className="flex items-center gap-2 text-sm">
          <span>Sort:</span>
          <Button
            size="sm"
            variant={sortBy === 'date' ? 'primary' : 'outline'}
            onClick={() => setSortBy('date')}
          >
            Date
          </Button>
          <Button
            size="sm"
            variant={sortBy === 'amount' ? 'primary' : 'outline'}
            onClick={() => setSortBy('amount')}
          >
            Amount
          </Button>
          <Button size="sm" variant="outline" onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>
            {sortDir === 'asc' ? 'Asc' : 'Desc'}
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <Table className="[&_th]:px-2.5 [&_td]:px-2.5 [&_th]:py-2 [&_td]:py-2">
          <THead>
            <TR>
              <TH>ID</TH>
              <TH>Date</TH>
              <TH>Remark</TH>
              <TH>From/To</TH>
              <TH>Type</TH>
              <TH>Amount</TH>
              <TH>Balance</TH>
              <TH></TH>
            </TR>
          </THead>
          <TBody>
            {filtered.map((r) => (
              <TR key={r.id}>
                <TD className="text-xs text-muted underline cursor-pointer" onClick={() => router.push(`/statements/${r.id}`)}>
                  {r.id}
                </TD>
                <TD>
                  <Input
                    type="datetime-local"
                    value={r.transaction_at ? format(new Date(r.transaction_at), "yyyy-MM-dd'T'HH:mm") : ''}
                    onChange={(e) => updateField(r.id, 'transaction_at', e.target.value || null)}
                  />
                </TD>
                <TD>
                  <Input value={r.remark || ''} onChange={(e) => updateField(r.id, 'remark', e.target.value)} />
                </TD>
                <TD>
                  <Input value={r.from_or_to || ''} onChange={(e) => updateField(r.id, 'from_or_to', e.target.value)} />
                </TD>
                <TD>
                  <Input
                    value={r.type || ''}
                    onChange={(e) => updateField(r.id, 'type', e.target.value)}
                    placeholder="cr/db"
                  />
                </TD>
                <TD>
                  <Input
                    type="number"
                    value={r.amount ?? ''}
                    onChange={(e) => updateField(r.id, 'amount', e.target.value ? Number(e.target.value) : null)}
                  />
                </TD>
                <TD>
                  <Input
                    type="number"
                    value={r.balance ?? ''}
                    onChange={(e) => updateField(r.id, 'balance', e.target.value ? Number(e.target.value) : null)}
                  />
                </TD>
                <TD>
                  <Button size="sm" onClick={() => save(r)} disabled={savingId === r.id}>
                    {savingId === r.id ? 'Saving…' : 'Save'}
                  </Button>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>
      </div>
    </div>
  );
}

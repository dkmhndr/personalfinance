'use client';

import Papa from 'papaparse';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

type ParsedRow = {
  id?: number | string;
  transaction_at?: string;
  from_or_to?: string;
  remark?: string;
  type?: 'cr' | 'db' | string;
  amount?: number;
  balance?: number;
};

const col = (row: Record<string, string>, needles: string[]) => {
  const lower = Object.keys(row).reduce<Record<string, string>>((acc, k) => {
    acc[k.toLowerCase()] = row[k];
    return acc;
  }, {});
  for (const key of Object.keys(lower)) {
    if (needles.some((n) => key.includes(n))) return lower[key];
  }
  return '';
};

function parseAmount(v: string) {
  if (!v) return 0;
  const cleaned = v.replace(/[^\d\-,.]/g, '').replace(/\./g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return Number.isFinite(num) ? num : 0;
}

function mapRow(row: Record<string, string>, idx: number): ParsedRow | null {
  const idVal = col(row, ['id']);
  const date = col(row, ['tanggal', 'date', 'posting', 'transaction']);
  const remark = col(row, ['remark', 'deskripsi', 'description', 'rincian', 'keterangan']);
  const fromto = col(row, ['from', 'to', 'sumber', 'tujuan', 'counterparty']);
  const typeRaw = col(row, ['type', 'jenis', 'cr', 'db']);
  const amt = col(row, ['amount', 'jumlah', 'nominal', 'nilai']);
  const bal = col(row, ['saldo', 'balance']);
  if (!remark && !fromto && !amt) return null;
  return {
    id: idVal || undefined,
    transaction_at: date || undefined,
    remark: remark || undefined,
    from_or_to: fromto || undefined,
    type: typeRaw || undefined,
    amount: parseAmount(amt || '0'),
    balance: bal ? parseAmount(bal) : undefined,
  };
}

export default function ImportClient() {
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [status, setStatus] = useState<'idle' | 'parsing' | 'uploading' | 'done' | 'error'>('idle');
  const [message, setMessage] = useState<string | null>(null);

  const isPdf = (file: File) =>
    file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

  const normalizeType = (value: string | undefined): 'cr' | 'db' => {
    const v = (value || '').toLowerCase();
    if (v === 'cr' || v === 'credit' || v === 'c') return 'cr';
    if (v === 'db' || v === 'debit' || v === 'd') return 'db';
    return 'db';
  };

  const setRowValue = (index: number, key: keyof ParsedRow, value: any) => {
    setRows((prev) =>
      prev.map((row, idx) => (idx === index ? { ...row, [key]: value } : row)),
    );
  };

  const removeRow = (index: number) => {
    setRows((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handlePdf = async (file: File) => {
    setRows([]);
    setStatus('parsing');
    setMessage('Parsing PDF…');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/import/pdf', {
        method: 'POST',
        body: form,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setStatus('error');
        setMessage(err.message || 'PDF parse failed');
        return;
      }
      const data = await res.json();
      const parsedRows = (data.rows || []) as ParsedRow[];
      setRows(parsedRows);
      setStatus('idle');
      setMessage(`Parsed ${parsedRows.length} rows. Review & edit before import.`);
    } catch (err) {
      console.error(err);
      setStatus('error');
      setMessage('PDF parse failed');
    }
  };

  const handleCsv = (file: File) => {
    if (!file) return;
    setStatus('parsing');
    setMessage(null);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const mapped = result.data
          .map(mapRow)
          .filter(Boolean) as ParsedRow[];
        setRows(mapped);
        setStatus('idle');
        setMessage(`Parsed ${mapped.length} rows. Review & edit before import.`);
      },
      error: () => {
        setStatus('error');
        setMessage('Failed to parse CSV');
      },
    });
  };

  const handleFile = (file: File | null) => {
    if (!file) return;
    if (isPdf(file)) {
      void handlePdf(file);
    } else {
      handleCsv(file);
    }
  };

  const upload = async () => {
    if (rows.length === 0) return;
    setStatus('uploading');
    setMessage(null);
    const sanitized = rows.map((r, idx) => ({
      id: r.id ?? Date.now() + idx,
      transaction_at: r.transaction_at || new Date().toISOString(),
      from_or_to: r.from_or_to || '',
      remark: r.remark || '',
      type: normalizeType(r.type),
      amount: Number.isFinite(r.amount as number) ? Number(r.amount) : 0,
      balance:
        r.balance === null || r.balance === undefined
          ? null
          : Number.isFinite(r.balance as number)
            ? Number(r.balance)
            : null,
    }));
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows: sanitized }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      setStatus('error');
      setMessage(err.message || 'Upload failed');
      return;
    }
    const data = await res.json();
    setStatus('done');
    setMessage(`Imported ${data.insertedRaw} rows. Sync: inserted ${data.sync?.inserted ?? 0}, skipped ${data.sync?.skipped ?? 0}`);
  };

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <Input
          type="file"
          accept=".csv,text/csv,application/pdf,.pdf"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />
        {rows.length > 0 && (
          <>
            <div className="text-sm text-muted">
              Preview & edit ({rows.length} rows). Click “Import & Sync” to save your edits.
            </div>
            <div className="overflow-auto border rounded">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 text-left">
                    <th className="px-2 py-1">Date</th>
                    <th className="px-2 py-1">From/To</th>
                    <th className="px-2 py-1">Remark</th>
                    <th className="px-2 py-1">Type</th>
                    <th className="px-2 py-1">Amount</th>
                    <th className="px-2 py-1">Balance</th>
                    <th className="px-2 py-1">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={`${row.id ?? idx}`} className="border-t">
                      <td className="px-2 py-1">
                        <Input
                          value={row.transaction_at || ''}
                          onChange={(e) => setRowValue(idx, 'transaction_at', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          value={row.from_or_to || ''}
                          onChange={(e) => setRowValue(idx, 'from_or_to', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          value={row.remark || ''}
                          onChange={(e) => setRowValue(idx, 'remark', e.target.value)}
                        />
                      </td>
                      <td className="px-2 py-1">
                        <select
                          className="h-9 w-full rounded border bg-background px-2"
                          value={normalizeType(row.type)}
                          onChange={(e) => setRowValue(idx, 'type', e.target.value)}
                        >
                          <option value="cr">cr (credit)</option>
                          <option value="db">db (debit)</option>
                        </select>
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          type="number"
                          value={row.amount ?? ''}
                          onChange={(e) =>
                            setRowValue(
                              idx,
                              'amount',
                              e.target.value === '' ? undefined : parseFloat(e.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Input
                          type="number"
                          value={row.balance ?? ''}
                          onChange={(e) =>
                            setRowValue(
                              idx,
                              'balance',
                              e.target.value === '' ? undefined : parseFloat(e.target.value),
                            )
                          }
                        />
                      </td>
                      <td className="px-2 py-1">
                        <Button variant="ghost" size="sm" onClick={() => removeRow(idx)}>
                          Remove
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        <Button onClick={upload} disabled={status === 'uploading' || rows.length === 0}>
          {status === 'uploading' ? 'Uploading & Syncing…' : 'Import & Sync'}
        </Button>
        {message && <div className="text-sm text-muted">{message}</div>}
      </CardContent>
    </Card>
  );
}

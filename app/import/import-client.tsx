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
  type?: string;
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

  const handleFile = (file: File | null) => {
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
        setMessage(`Parsed ${mapped.length} rows`);
      },
      error: () => {
        setStatus('error');
        setMessage('Failed to parse CSV');
      },
    });
  };

  const upload = async () => {
    if (rows.length === 0) return;
    setStatus('uploading');
    setMessage(null);
    const res = await fetch('/api/import', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rows }),
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
        <Input type="file" accept=".csv,text/csv" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
        {rows.length > 0 && (
          <div className="text-sm text-muted">
            Ready to upload {rows.length} rows.
          </div>
        )}
        <Button onClick={upload} disabled={status === 'uploading' || rows.length === 0}>
          {status === 'uploading' ? 'Uploading & Syncing…' : 'Import & Sync'}
        </Button>
        {message && <div className="text-sm text-muted">{message}</div>}
      </CardContent>
    </Card>
  );
}

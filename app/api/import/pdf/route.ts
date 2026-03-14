import { NextRequest, NextResponse } from 'next/server';
import { parseStatementText, type StatementRow } from '@/lib/statement-parser';

// Use CJS export from pdf-parse v1.x (function)
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse: (buffer: Buffer) => Promise<{ text: string }> = require('pdf-parse');

// Minimal DOMMatrix polyfill for pdfjs inside pdf-parse
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const dm = require('@thednp/dommatrix');
    const ctor = dm.DOMMatrix || dm.DOMMatrixReadOnly || dm.default || dm;
    (globalThis as any).DOMMatrix = ctor;
    (globalThis as any).DOMMatrixReadOnly = ctor;
  } catch {
    class FakeDOMMatrix {
      a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
      m11 = 1; m12 = 0; m21 = 0; m22 = 1; m41 = 0; m42 = 0;
      invertSelf() { return this; }
      translateSelf() { return this; }
      scaleSelf() { return this; }
      rotateSelf() { return this; }
      multiplySelf() { return this; }
    }
    (globalThis as any).DOMMatrix = FakeDOMMatrix as any;
    (globalThis as any).DOMMatrixReadOnly = FakeDOMMatrix as any;
  }
}

// Disable pdfjs worker to avoid missing worker file in serverless
process.env.PDFJS_DISABLE_WORKER = 'true';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type ParsedRow = {
  id: number;
  transaction_at: string;
  from_or_to: string;
  remark: string;
  type: 'cr' | 'db';
  amount: number;
  balance: number | null;
};

function toParsedRow(row: StatementRow, idx: number): ParsedRow {
  const now = Date.now();
  const remark =
    row.rincianTransaksi !== '-' && row.catatan !== '-'
      ? `${row.rincianTransaksi} (${row.catatan})`
      : row.rincianTransaksi === '-'
        ? row.catatan
        : row.rincianTransaksi;

  const amount = Number.isFinite(row.jumlah ?? Number.NaN) ? (row.jumlah as number) : 0;
  const balance = Number.isFinite(row.saldo ?? Number.NaN) ? (row.saldo as number) : null;
  const type: 'cr' | 'db' = amount < 0 ? 'db' : 'cr';

  return {
    id: now + idx,
    transaction_at: row.tanggalWaktu || new Date().toISOString(),
    from_or_to: row.sumberTujuan || '',
    remark: remark || '',
    type,
    amount,
    balance,
  };
}

async function readPdfBuffer(req: NextRequest): Promise<Buffer> {
  const contentType = req.headers.get('content-type') || '';
  if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const file = form.get('file');
    if (!file || !(file instanceof Blob)) throw new Error('file field is required');
    const ab = await (file as Blob).arrayBuffer();
    return Buffer.from(ab);
  }
  const ab = await req.arrayBuffer();
  if (!ab || ab.byteLength === 0) throw new Error('empty body');
  return Buffer.from(ab);
}

export async function POST(req: NextRequest) {
  try {
    const buffer = await readPdfBuffer(req);
    const parsed = await pdfParse(buffer);
    const rows = parseStatementText(parsed.text || '');
    if (!rows.length) {
      return NextResponse.json({ message: 'No transactions found in PDF' }, { status: 400 });
    }
    const normalized = rows.map(toParsedRow);
    return NextResponse.json({ ok: true, rows: normalized, count: normalized.length });
  } catch (err: any) {
    console.error('[import/pdf] error', err);
    return NextResponse.json(
      { message: err?.message || 'Failed to parse PDF' },
      { status: 500 },
    );
  }
}

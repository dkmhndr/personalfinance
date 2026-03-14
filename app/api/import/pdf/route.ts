import { NextRequest, NextResponse } from 'next/server';
import { parseStatementText, type StatementRow } from '@/lib/statement-parser';

// pdfjs (used by pdf-parse) expects DOMMatrix in the global scope in Node.
if (typeof (global as any).DOMMatrix === 'undefined') {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const lib = require('@thednp/dommatrix');
    const DomMatrixCtor = (lib && lib.DOMMatrix) || lib;
    (global as any).DOMMatrix = DomMatrixCtor;
    // Some libs reference DOMMatrixReadOnly; map to the same ctor if missing.
    if (typeof (global as any).DOMMatrixReadOnly === 'undefined') {
      (global as any).DOMMatrixReadOnly = DomMatrixCtor;
    }
  } catch (e) {
    console.warn('DOMMatrix polyfill missing; install `dommatrix` to parse PDFs.');
  }
}

type ParsedRow = {
  id: number;
  transaction_at: string;
  from_or_to: string;
  remark: string;
  type: 'cr' | 'db';
  amount: number;
  balance: number | null;
};

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

let pdfPromise: Promise<any> | null = null;
async function getPdfParser() {
  if (!pdfPromise) {
    pdfPromise = import('pdf-parse');
  }
  const mod = await pdfPromise;
  return (mod as any).default ?? mod;
}

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
    if (!file || !(file instanceof Blob)) {
      throw new Error('file field is required');
    }
    const arrayBuffer = await file.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  const arrayBuffer = await req.arrayBuffer();
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error('empty body');
  }
  return Buffer.from(arrayBuffer);
}

export async function POST(req: NextRequest) {
  try {
    const pdf = await getPdfParser();
    const buffer = await readPdfBuffer(req);
    const parsed = await pdf(buffer);
    const rows = parseStatementText(parsed.text || '');

    if (!rows.length) {
      return NextResponse.json({ message: 'No transactions found in PDF' }, { status: 400 });
    }

    const normalized = rows.map(toParsedRow);

    return NextResponse.json({ ok: true, rows: normalized, count: normalized.length });
  } catch (err: any) {
    return NextResponse.json(
      { message: err?.message || 'Failed to parse PDF' },
      { status: 500 },
    );
  }
}

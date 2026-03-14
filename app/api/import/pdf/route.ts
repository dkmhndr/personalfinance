import { NextRequest, NextResponse } from 'next/server';
import DomMatrixImport from '@thednp/dommatrix';
import { parseStatementText, type StatementRow } from '@/lib/statement-parser';

// Ensure DOMMatrix is available before pdf-parse loads.
const DomMatrixAny =
  (DomMatrixImport as any).DOMMatrix ||
  (DomMatrixImport as any).DOMMatrixReadOnly ||
  (DomMatrixImport as any);
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = DomMatrixAny;
  (globalThis as any).DOMMatrixReadOnly = DomMatrixAny;
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

let pdfParseFn: any | null = null;
async function getPdfParse() {
  if (!pdfParseFn) {
    const req = eval('require') as NodeRequire;
    let mod: any;
    let fn: any = null;
    try {
      mod = req('pdf-parse');
      fn = typeof mod === 'function' ? mod : (typeof mod?.default === 'function' ? mod.default : null);
    } catch (e) {
      // fallback tried below
    }
    if (!fn) {
      try {
        fn = req('pdf-parse/lib/pdf-parse');
      } catch (e) {
        // continue to throw
      }
    }
    if (!fn) throw new Error('pdf-parse function not found; ensure dependency is installed');
    pdfParseFn = fn;
  }
  return pdfParseFn as (buf: Buffer) => Promise<{ text: string }>;
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
    const buffer = await readPdfBuffer(req);
    const pdfParse = await getPdfParse();
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

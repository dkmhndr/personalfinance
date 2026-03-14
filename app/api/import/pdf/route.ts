import { NextRequest, NextResponse } from 'next/server';
import { parseStatementText, type StatementRow } from '@/lib/statement-parser';

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

async function extractText(buffer: Buffer): Promise<string> {
  // Lazy require to keep Next bundler happy
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const dommatrix = require('@thednp/dommatrix');
  const domCtor =
    dommatrix.DOMMatrix ||
    dommatrix.DOMMatrixReadOnly ||
    dommatrix.default ||
    dommatrix;
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = domCtor;
  }
  if (typeof (globalThis as any).DOMMatrixReadOnly === 'undefined') {
    (globalThis as any).DOMMatrixReadOnly = domCtor;
  }

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const pdfParseMod = require('pdf-parse');
  const PDFParse =
    pdfParseMod.PDFParse ||
    pdfParseMod.default?.PDFParse ||
    pdfParseMod.default ||
    pdfParseMod;

  if (typeof PDFParse !== 'function') {
    throw new Error('pdf-parse export not found');
  }

  const parser = new PDFParse({ data: buffer, disableWorker: true });
  const result = await parser.getText();
  await parser.destroy?.();
  return result.text || '';
}

export async function POST(req: NextRequest) {
  try {
    const buffer = await readPdfBuffer(req);
    const text = await extractText(buffer);
    const rows = parseStatementText(text || '');

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

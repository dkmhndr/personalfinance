import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { z } from 'zod';
import { CategorizationResult, CategoryType } from '@/types';

const requestSchema = z.object({
  transactions: z.array(
    z.object({
      id: z.string(),
      description: z.string().max(400),
      amount: z.number(),
      date: z.string().optional(),
    }),
  ),
});

const keywords: Array<{ pattern: RegExp; category: CategoryType; note?: string }> = [
  { pattern: /(salary|gaji|payroll|income|honor)/i, category: 'Income:Salary' },
  { pattern: /(bonus|commission|komisi|thr)/i, category: 'Income:Bonus' },
  { pattern: /(interest|bunga|dividen|dividend|yield)/i, category: 'Income:Investment' },
  { pattern: /(bibit|reksadana|reksa\\s*dana|rdpt|rdpu|rdsp|rd\\b)/i, category: 'Income:Investment', note: 'Investasi/reksa dana (Bibit)' },
  { pattern: /(rent|sewa|kontrakan|kos)/i, category: 'Expense:Housing' },
  { pattern: /(pln|pdam|listrik|air|utility|utilities)/i, category: 'Expense:Utilities' },
  { pattern: /(grabfood|gofood|foodpanda|restaurant|resto|cafe|starbucks|mcd|kfc|burger|pizza|warmindo|warung|pecel\\s*lele|padang|mie\\s*gacoan|bakso|soto|sate|martabak)/i, category: 'Expense:Food & Dining' },
  { pattern: /(alfamart|indomaret|supermarket|grocery|grocer|market)/i, category: 'Expense:Groceries' },
  { pattern: /(fuel|pertalite|pertamax|shell|bbm|spbu|tol|parking|parkir|transport|gojek|grab|gocar|grabcar|grabbike)/i, category: 'Expense:Transport' },
  { pattern: /(bpjs|clinic|hospital|rs\b|doctor|dokter|pharmacy|apotek|health|medical)/i, category: 'Expense:Healthcare' },
  { pattern: /(school|tuition|kuliah|course|course|bootcamp|education|bimbel)/i, category: 'Expense:Education' },
  { pattern: /(netflix|spotify|youtube|subscription|membership|langganan)/i, category: 'Expense:Subscriptions' },
  { pattern: /(pulsa|paket\\s*data|telkomsel|tsel|indosat|im3|xl|axis|tri\\b|smartfren|byu\\b)/i, category: 'Expense:Utilities', note: 'Telekomunikasi' },
  { pattern: /(tokopedia|shopee|bukalapak|lazada|blibli|jd\\.id|zalora)/i, category: 'Expense:Shopping' },
  { pattern: /(fee|admin|transfer|biaya|charge)/i, category: 'Expense:Fees & Charges' },
  { pattern: /(penarikan\\s+tunai|tarik\\s+tunai|atm\\s+cash\\s*out|cash\\s*out)/i, category: 'Expense:Fees & Charges', note: 'Cash out / tarik tunai' },
  { pattern: /(travel|hotel|airbnb|flight|garuda|lion|trip|tour)/i, category: 'Expense:Travel' },
  { pattern: /(zakat|donasi|donation|charity)/i, category: 'Expense:Fees & Charges' },
  { pattern: /(saving|tabungan|deposit)/i, category: 'Saving' },
  { pattern: /(kantong|antar\s*kantong|pindah\s*kantong|move\s*to\s*pocket)/i, category: 'Transfer', note: 'Transfer internal antar kantong (abaikan di laporan)' },
  { pattern: /(ovo|gopay|dana|linkaja|shopeepay|top\s*up|wallet|transfer)/i, category: 'Transfer' },
];

const BATCH_SIZE = 50;

function heuristicCategorize(transactions: { id: string; description: string; amount: number }[]): CategorizationResult {
  const items = transactions.map((tx): CategorizationResult['items'][number] => {
    const desc = tx.description.toLowerCase();
    const absAmt = Math.abs(tx.amount);

    // Wallet heuristics: GoPay/ShopeePay/OVO/DANA mostly food if small tickets
    if (/(gopay|shopeepay|shopee|ovo|dana|linkaja)/i.test(desc)) {
      if (tx.amount < 0 && absAmt <= 70000) {
        return {
          id: tx.id,
          category: 'Expense:Food & Dining',
          note: 'Dompet digital ticket kecil diasumsikan makanan/minuman',
          confidence: 0.62,
        };
      }
      if (tx.amount < 0) {
        return {
          id: tx.id,
          category: 'Expense:Shopping',
          note: 'Dompet digital >70k diasumsikan belanja/non-makanan',
          confidence: 0.55,
        };
      }
      // incoming/top-up
      return {
        id: tx.id,
        category: 'Transfer',
        note: 'Top-up dompet digital / incoming transfer',
        confidence: 0.5,
      };
    }

    const matched = keywords.find((k) => k.pattern.test(desc));
    if (matched) {
      return {
        id: tx.id,
        category: matched.category,
        note: matched.note,
        confidence: 0.64,
      } satisfies CategorizationResult['items'][number];
    }

    if (tx.amount > 0) {
      return { id: tx.id, category: 'Income:Other', confidence: 0.45 } as const;
    }

    return { id: tx.id, category: 'Uncategorized', confidence: 0.2 } as const;
  });

  return { items };
}

function parseJsonFlexible<T>(text: string): T | null {
  try {
    return JSON.parse(text) as T;
  } catch (_) {
    // try strip fences
    const fenced = text.trim().match(/```(?:json)?\\n([\\s\\S]*?)\\n```/i);
    if (fenced && fenced[1]) {
      try {
        return JSON.parse(fenced[1]) as T;
      } catch (_) {
        return null;
      }
    }
    // try extract longest balanced JSON object/array starting at first brace
    const start = text.indexOf('{');
    if (start !== -1) {
      let depth = 0;
      let inString = false;
      let escaped = false;
      let lastBalanced = -1;
      const stack: ('{' | '[')[] = [];
      for (let i = start; i < text.length; i += 1) {
        const ch = text[i];
        if (inString) {
          if (escaped) {
            escaped = false;
          } else if (ch === '\\\\') {
            escaped = true;
          } else if (ch === '\"') {
            inString = false;
          }
        } else {
          if (ch === '\"') {
            inString = true;
          } else if (ch === '{' || ch === '[') {
            stack.push(ch as '{' | '[');
            depth += 1;
          } else if (ch === '}' || ch === ']') {
            depth -= 1;
            stack.pop();
            if (depth === 0) {
              lastBalanced = i;
              break;
            }
          }
        }
      }
      if (lastBalanced !== -1) {
        const slice = text.slice(start, lastBalanced + 1);
        try {
          return JSON.parse(slice) as T;
        } catch (_) {
          return null;
        }
      }

      // attempt to auto-close unbalanced JSON if not inside string
      if (!inString && depth > 0 && stack.length > 0 && stack.length <= 8) {
        let repaired = text.slice(start);
        for (let i = stack.length - 1; i >= 0; i -= 1) {
          repaired += stack[i] === '{' ? '}' : ']';
        }
        try {
          return JSON.parse(repaired) as T;
        } catch (_) {
          return null;
        }
      }
    }
    return null;
  }
}

function coerceConfidence(val: unknown): number | undefined {
  if (typeof val === 'number' && Number.isFinite(val)) return Math.max(0, Math.min(1, val));
  if (typeof val === 'string') {
    const lc = val.toLowerCase();
    if (lc.includes('high')) return 0.9;
    if (lc.includes('med')) return 0.6;
    if (lc.includes('low')) return 0.3;
    const num = parseFloat(val);
    if (Number.isFinite(num)) return Math.max(0, Math.min(1, num));
  }
  return undefined;
}

function respondHeuristic(transactions: { id: string; description: string; amount: number }[], reason?: string) {
  return NextResponse.json({ ...heuristicCategorize(transactions), provider: 'heuristic', reason });
}

export async function POST(req: NextRequest) {
  const json = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(json);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  const { transactions } = parsed.data;

  if (!process.env.OPENAI_API_KEY) {
    return respondHeuristic(transactions, 'OPENAI_API_KEY missing');
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const allowedCategories: CategoryType[] = [
    'Income:Salary',
    'Income:Bonus',
    'Income:Investment',
    'Income:Other',
    'Expense:Housing',
    'Expense:Utilities',
    'Expense:Food & Dining',
    'Expense:Groceries',
    'Expense:Transport',
    'Expense:Healthcare',
    'Expense:Education',
    'Expense:Entertainment',
    'Expense:Shopping',
    'Expense:Fees & Charges',
    'Expense:Subscriptions',
    'Expense:Travel',
    'Transfer',
    'Saving',
    'Uncategorized',
  ];

  const system =
    'You are a personal bookkeeper. Choose exactly one category per transaction from this list: ' +
    allowedCategories.join(', ') +
    '. Negative amounts are expenses; positive are income or transfer. Prefer a concrete category; avoid Uncategorized unless no clue. Treat words like \"bibit\", \"reksadana\" as Income:Investment. Keep replies as compact JSON.';

  async function callOpenAI(batch: typeof transactions) {
    const user = `Transactions (amount < 0 means money out):\n${JSON.stringify(batch, null, 2)}\nReturn JSON {"items":[{"id","category","note","confidence"}]} only.`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 500,
    });

    const content = completion.choices[0].message?.content;
    if (!content) throw new Error('OpenAI returned empty content');

    const parsed = parseJsonFlexible<CategorizationResult>(content);
    if (!parsed?.items) {
      const snippet = content.slice(0, 240);
      const tail = content.slice(-120);
      console.error('OpenAI content not parseable/shape invalid', { contentSnippet: snippet, contentTail: tail, length: content.length });
      throw new Error(`OpenAI JSON parse/shape failed; head=${snippet} ... tail=${tail}`);
    }

    return {
      items: parsed.items.map((item) => ({
        id: item.id,
        category: (allowedCategories.includes(item.category as CategoryType) ? item.category : 'Uncategorized') as CategoryType,
        note: item.note,
        confidence: coerceConfidence(item.confidence),
      })),
    } satisfies CategorizationResult;
  }

  const heuristic = heuristicCategorize(transactions);

  // If AI unavailable, return heuristic straight away
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ ...heuristic, provider: 'heuristic' });
  }

  try {
    // AI hanya untuk memberi note tambahan; kategori tetap heuristic
    let aiNotes: CategorizationResult['items'] = [];
    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      try {
        const ai = await callOpenAI(batch);
        aiNotes = aiNotes.concat(ai.items);
      } catch (err) {
        console.error('AI batch note failed, ignore notes for batch', err);
      }
    }

    const merged = heuristic.items.map((h) => {
      const ai = aiNotes.find((a) => a.id === h.id);
      return {
        ...h,
        note: ai?.note || h.note,
        confidence: h.confidence ?? ai?.confidence,
      };
    });

    return NextResponse.json({ items: merged, provider: 'heuristic+ai-notes' });
  } catch (error) {
    console.error('AI categorize failed', error);
    return NextResponse.json({ ...heuristic, provider: 'heuristic', reason: 'AI notes failed' });
  }
}

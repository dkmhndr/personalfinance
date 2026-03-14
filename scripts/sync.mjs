#!/usr/bin/env node
/**
 * CLI sync runner to avoid Next.js route timeouts.
 * Loads .env.local manually, then performs the same pipeline as /api/sync
 * but without AI (to keep it fast). Re-run anytime; it skips already-processed rows.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

// --- Env loader (lightweight .env.local parser) ---
function loadEnv(file = '.env.local') {
  const full = path.join(process.cwd(), file);
  if (!fs.existsSync(full)) return;
  const lines = fs.readFileSync(full, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^\s*([\w.-]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2];
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnv();

// --- Config ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

// --- Helpers ---
const normalizeDescription = (raw) =>
  (raw || '')
    .toUpperCase()
    .replace(/[0-9]{6,}/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[^A-Z0-9\s]/g, '')
    .trim();

const applyAlias = (desc, aliases) =>
  desc
    .split(' ')
    .map((w) => {
      const hit = aliases.find((a) => a.alias === w);
      return hit ? hit.normalized : w;
    })
    .join(' ');

const matchRules = (desc, amount, rules) => {
  for (const r of rules.sort((a, b) => a.priority - b.priority)) {
    const kw = r.keyword.toUpperCase();
    if (!desc.includes(kw)) continue;
    if (r.min_amount !== null && amount < r.min_amount) continue;
    if (r.max_amount !== null && amount > r.max_amount) continue;
    return r.category_id;
  }
  return null;
};

const mapBankType = (t) => {
  if (t?.toLowerCase() === 'cr') return 'income';
  if (t?.toLowerCase() === 'db') return 'expense';
  return 'transfer';
};

async function fetchAll(table) {
  const rows = [];
  let from = 0;
  const pageSize = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select('*').order('transaction_at', { ascending: true }).range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function aiCategorize(desc, amount, categories) {
  if (!openai) return null;
  const labels = categories.map((c) => c.name).join(', ');
  const prompt = `You are a finance transaction categorizer. Choose the single best category from this list: ${labels}.\nTransaction: "${desc}" amount ${amount}. Respond with JSON {"category":"<name>","confidence":<0-1>}.`;
  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0,
    response_format: { type: 'json_object' },
  });
  const raw = res.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  const cat = categories.find((c) => c.name.toUpperCase() === String(parsed.category).toUpperCase());
  return cat ? { categoryId: cat.id, confidence: Number(parsed.confidence) || 0.4 } : null;
}

async function main() {
  try {
    console.log('Starting sync...');
    const [{ data: aliases }, { data: rules }, { data: categories }] = await Promise.all([
      supabase.from('alias_dictionary').select('*'),
      supabase.from('rules').select('*'),
      supabase.from('categories').select('*'),
    ]);
    if (!categories || categories.length === 0) throw new Error('Categories empty; run seeds first.');

    const { data: existing } = await supabase.from('transactions').select('source_id');
    const processed = new Set((existing || []).map((r) => r.source_id));

    const rawRows = await fetchAll('bank_jago_statements');
    console.log(`Fetched raw rows: ${rawRows.length}`);
    const accountRes = await supabase.from('accounts').select('id').eq('name', 'Main Account').maybeSingle();
    if (accountRes.error || !accountRes.data) throw new Error('Seed account "Main Account" not found.');
    const accountId = accountRes.data.id;
    const fallbackCat = categories.find((c) => c.name === 'Other')?.id || null;

    const newRows = rawRows.filter((r) => !processed.has(r.id));
    if (newRows.length === 0) {
      console.log('Nothing to sync.');
      return;
    }

    const disableAI = process.env.SYNC_DISABLE_AI === 'true';
    const forceAI = process.env.SYNC_FORCE_AI === 'true';
    const enableAI = !!openai && (forceAI || (!disableAI && newRows.length <= 500));
    console.log(`New rows to process: ${newRows.length}. AI: ${enableAI ? 'on' : 'off'}${forceAI ? ' (forced)' : ''}`);
    const batchSize = 200;
    let buffer = [];
    let inserted = 0;
    let skipped = 0;

    let processedCount = 0;
    for (const row of newRows) {
      const description = `${row.remark || ''} ${row.from_or_to || ''}`.trim();
      const amount = Math.abs(Number(row.amount));
      const type = mapBankType(row.type);
      const normalized = applyAlias(normalizeDescription(description), aliases || []);
      const ruleCat = matchRules(normalized, amount, rules || []);
      let categoryId = ruleCat || fallbackCat;
      let source = ruleCat ? 'rule' : 'none';

      if (!ruleCat && enableAI) {
        const ai = await aiCategorize(normalized, amount, categories || []);
        if (ai && ai.confidence >= 0.55) {
          categoryId = ai.categoryId;
          source = 'ai';
        }
      }

      buffer.push({
        id: crypto.randomUUID(),
        source_id: row.id,
        account_id: accountId,
        transaction_at: row.transaction_at || row.created_at,
        description,
        amount,
        type,
        balance: row.balance,
        category_id: categoryId,
        categorization_source: source,
      });

      if (buffer.length >= batchSize) {
        const { error } = await supabase.from('transactions').insert(buffer);
        if (error) throw error;
        inserted += buffer.length;
        processedCount += buffer.length;
        const done = inserted + skipped;
        console.log(`Progress: ${Math.min(done, newRows.length)}/${newRows.length}`);
        buffer = [];
      }
    }

    if (buffer.length) {
      const { error } = await supabase.from('transactions').insert(buffer);
      if (error) throw error;
      inserted += buffer.length;
      processedCount += buffer.length;
      const done = inserted + skipped;
      console.log(`Progress: ${Math.min(done, newRows.length)}/${newRows.length}`);
    }

    console.log(`Sync complete. Inserted: ${inserted}, skipped: ${skipped}, total new rows: ${newRows.length}. AI: ${enableAI ? 'on' : 'off'}`);
  } catch (err) {
    console.error('Sync failed:', err?.message || err);
    process.exit(1);
  }
}

main();

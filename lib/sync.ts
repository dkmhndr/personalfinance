import { supabaseAdmin } from './supabase';
import { categorizeRecord, mapBankType, loadDictionaries } from './categorization';
import { type TransactionType } from '@/types';

async function fetchAllRawStatements(pageSize = 1000) {
  const rows: any[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabaseAdmin
      .from('bank_jago_statements')
      .select('*')
      .order('transaction_at', { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    rows.push(...data);
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return rows;
}

async function getDefaultAccountId() {
  const { data, error } = await supabaseAdmin.from('accounts').select('id').eq('name', 'Main Account').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Seed account "Main Account" not found. Run seeds first.');
  return data.id;
}

async function getFallbackCategoryId() {
  const { data, error } = await supabaseAdmin.from('categories').select('id').eq('name', 'Other').maybeSingle();
  if (error) throw error;
  if (!data) throw new Error('Seed category "Other" not found. Run seeds first.');
  return data.id;
}

async function getTransferCategoryId() {
  const { data, error } = await supabaseAdmin.from('categories').select('id').eq('name', 'Transfer').maybeSingle();
  if (error) throw error;
  return data?.id || null;
}

export async function syncBankStatements() {
  const accountId = await getDefaultAccountId();
  const fallbackCategory = await getFallbackCategoryId();
  const transferCategoryId = await getTransferCategoryId();
  const dictionaries = await loadDictionaries();

  // Backfill existing rows that were previously misclassified as income/expense.
  const { error: fixErr } = await supabaseAdmin
    .from('transactions')
    .update({
      type: 'transfer',
      category_id: transferCategoryId,
      categorization_source: 'rule',
    })
    .in('type', ['income', 'expense'])
    .ilike('description', '%pindah uang antar kantong%');
  if (fixErr) throw fixErr;

  // Also normalize any rows already categorized as Transfer but still typed as income/expense.
  if (transferCategoryId) {
    const { error: fixTransferTypeErr } = await supabaseAdmin
      .from('transactions')
      .update({ type: 'transfer' })
      .eq('category_id', transferCategoryId)
      .in('type', ['income', 'expense']);
    if (fixTransferTypeErr) throw fixTransferTypeErr;
  }

  const { data: existing } = await supabaseAdmin.from('transactions').select('source_id');
  const processedIds = new Set((existing || []).map((t) => t.source_id));

  const rawRows = await fetchAllRawStatements();
  const newRows = rawRows.filter((r) => !processedIds.has(r.id));

  if (newRows.length === 0) {
    return { inserted: 0, skipped: rawRows.length, total: 0 };
  }

  const disableAI = process.env.SYNC_DISABLE_AI === 'true';
  const forceAI = process.env.SYNC_FORCE_AI === 'true';
  // Default: AI for small batches; allow force on/off via env
  const enableAI = !!process.env.OPENAI_API_KEY && (forceAI || (!disableAI && newRows.length <= 500));

  let inserted = 0;
  let skipped = 0;
  const batchSize = 200;
  let buffer: any[] = [];

  let processed = 0;
  for (const row of newRows || []) {
    const amount = Number(row.amount);
    const description = `${row.remark || ''} ${row.from_or_to || ''}`.trim();
    const type: TransactionType = mapBankType(row.type, description);
    const categorization = await categorizeRecord(
      description,
      Math.abs(amount),
      type,
      fallbackCategory,
      0.55,
      dictionaries,
      enableAI,
    );
    const categoryType = dictionaries.categories.find((c) => c.id === categorization.categoryId)?.type;
    const normalizedType: TransactionType = categoryType === 'transfer' ? 'transfer' : type;

    buffer.push({
      id: crypto.randomUUID(),
      source_id: row.id,
      account_id: accountId,
      transaction_at: row.transaction_at || row.created_at,
      description,
      amount: Math.abs(amount),
      type: normalizedType,
      balance: row.balance,
      category_id: categorization.categoryId,
      categorization_source: categorization.source,
    });

    if (buffer.length >= batchSize) {
      const { error } = await supabaseAdmin.from('transactions').insert(buffer);
      if (error) throw error;
      inserted += buffer.length;
      buffer = [];
      processed += batchSize;
      console.log(`Sync progress: ${Math.min(processed, newRows.length)}/${newRows.length}`);
    }
  }

  if (buffer.length) {
    const { error } = await supabaseAdmin.from('transactions').insert(buffer);
    if (error) throw error;
    inserted += buffer.length;
  }
  console.log(`Sync progress: ${newRows.length}/${newRows.length}`);
  return { inserted, skipped, total: newRows.length };
}

export async function overrideTransactionCategory(transactionId: string, categoryId: string) {
  const { data: category, error: catErr } = await supabaseAdmin
    .from('categories')
    .select('type')
    .eq('id', categoryId)
    .maybeSingle();
  if (catErr) throw catErr;

  const patch: { category_id: string; categorization_source: 'manual'; type?: TransactionType } = {
    category_id: categoryId,
    categorization_source: 'manual',
  };
  if (category?.type === 'transfer') {
    patch.type = 'transfer';
  }

  const { error } = await supabaseAdmin
    .from('transactions')
    .update(patch)
    .eq('id', transactionId);
  if (error) throw error;
}

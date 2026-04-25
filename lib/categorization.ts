import OpenAI from 'openai';
import { supabaseAdmin } from './supabase';
import { normalizeDescription } from './utils';
import { type Category, type Rule, type CategorizationSource, type TransactionType } from '@/types';

type AliasRow = { id: string; alias: string; normalized: string };

const openaiApiKey = process.env.OPENAI_API_KEY;
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export async function loadDictionaries() {
  const [{ data: aliases }, { data: rules, error: rulesError }, { data: categories, error: catError }] = await Promise.all([
    supabaseAdmin.from('alias_dictionary').select('*'),
    supabaseAdmin.from('rules').select('*, categories(*)').order('priority', { ascending: true }),
    supabaseAdmin.from('categories').select('*'),
  ]);

  if (rulesError || catError) {
    throw rulesError || catError;
  }

  return {
    aliases: aliases || [],
    rules: (rules || []) as Array<Rule & { categories: Category }>,
    categories: (categories || []) as Category[],
  };
}

export function applyAliasDictionary(description: string, aliases: AliasRow[]) {
  const normalized = description.split(' ').map((word) => {
    const hit = aliases.find((a) => a.alias === word);
    return hit ? hit.normalized : word;
  });
  return normalized.join(' ');
}

export function matchRules(
  description: string,
  amount: number,
  rules: Array<Rule & { categories: Category }>,
  txType: TransactionType,
) {
  for (const rule of rules.sort((a, b) => a.priority - b.priority)) {
    const kw = rule.keyword.toUpperCase();
    if (!description.includes(kw)) continue;
    if (rule.min_amount !== null && amount < rule.min_amount) continue;
    if (rule.max_amount !== null && amount > rule.max_amount) continue;
    // apply rule only if category type matches transaction type (or is transfer)
    const ruleCatType = (rule as any).categories?.type || (rule as any).category_type || null;
    if (ruleCatType && ruleCatType !== txType && ruleCatType !== 'transfer') continue;
    return { categoryId: rule.category_id, source: 'rule' as CategorizationSource };
  }
  return null;
}

export async function aiCategorize(description: string, amount: number, categories: Category[]) {
  if (!openai) return null;
  const labels = categories.map((c) => c.name).join(', ');
  const prompt = `You are a finance transaction categorizer. Choose the single best category from this list: ${labels}.\nTransaction: "${description}" amount ${amount}. Respond with JSON {\"category\":\"<name>\",\"confidence\":<0-1>}.`;
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      response_format: { type: 'json_object' },
    });
    const text = completion.choices[0]?.message?.content || '';
    // tolerate code fences or natural-language wrappers
    const cleaned = text.replace(/```(?:json)?/gi, '').trim();
    const jsonText = cleaned.match(/\{[\s\S]*\}/)?.[0] || cleaned;
    const parsed = JSON.parse(jsonText);
    const category = categories.find((c) => c.name.toUpperCase() === String(parsed.category).toUpperCase());
    if (!category) return null;
    return { categoryId: category.id, confidence: Number(parsed.confidence) || 0.4 };
  } catch (err) {
    console.error('aiCategorize error', err);
    return null;
  }
}

export async function categorizeRecord(
  rawDescription: string,
  amount: number,
  txType: TransactionType,
  fallbackCategoryId: string | null,
  confidenceThreshold = 0.55,
  preloaded?: {
    aliases: AliasRow[];
    rules: Array<Rule & { categories: Category }>;
    categories: Category[];
  },
  enableAI = true,
) {
  const { aliases, rules, categories } = preloaded || (await loadDictionaries());
  const normalized = normalizeDescription(rawDescription);
  const withAlias = applyAliasDictionary(normalized, aliases);
  const byRule = matchRules(withAlias, amount, rules, txType);
  if (byRule) return { categoryId: byRule.categoryId, source: 'rule' as CategorizationSource };

  if (enableAI) {
    const ai = await aiCategorize(withAlias, amount, categories);
    if (ai && ai.confidence >= confidenceThreshold) {
      return { categoryId: ai.categoryId, source: 'ai' as CategorizationSource, confidence: ai.confidence };
    }
  }

  return { categoryId: fallbackCategoryId, source: 'none' as CategorizationSource };
}

function isPocketTransfer(description?: string | null) {
  if (!description) return false;
  const normalized = normalizeDescription(description);
  return normalized.includes('PINDAH UANG ANTAR KANTONG');
}

export function mapBankType(type: string, description?: string | null): TransactionType {
  if (isPocketTransfer(description)) return 'transfer';
  if (type?.toLowerCase() === 'cr') return 'income';
  if (type?.toLowerCase() === 'db') return 'expense';
  return 'transfer';
}

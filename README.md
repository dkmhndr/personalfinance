# Personal Finance · Next.js + Supabase

Single-user personal finance dashboard. Pull raw bank statements from Supabase `bank_jago_statements`, normalize, categorize (rules + aliases + AI), and drill into charts + table.

## Stack
- Next.js 14 App Router · TypeScript
- TailwindCSS + light shadcn-style primitives
- Supabase (SQL + `@supabase/supabase-js`)
- Recharts for charts, TanStack Table for grid
- Optional OpenAI (`gpt-4o-mini`) for AI fallback categorization

## Quickstart
1) Install deps: `npm install`
2) Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
OPENAI_API_KEY=<optional>
AUTH_PASSWORD=<choose-a-strong-password>
# optional: different signing secret, defaults to AUTH_PASSWORD
# AUTH_SECRET=<another-secret>
```
3) Apply SQL: run `psql` or Supabase SQL editor with `supabase/migrations/0001_init.sql` then `supabase/seeds/seed.sql`.
4) Run dev server: `npm run dev` and open http://localhost:3000

## Features
- **Sync**: `/sync` or the dashboard button reads new rows from `bank_jago_statements`, maps type cr/db → income/expense, builds description (remark + from_or_to), normalizes, aliases, rule-match, AI fallback, inserts into `transactions`.
- **Rules CRUD**: `/rules` for keyword + min/max + priority mapping to categories.
- **Categories CRUD**: `/categories` for income/expense/transfer buckets.
- **Review**: `/review` lists AI/uncategorized items for manual override.
- **Dashboard**: KPIs, expense donut, cashflow trend (month/year toggle), daily spending, top categories, drill-down table with filters and manual category override.
- **Filters**: date range, category, source (rule/AI/manual/none), quick ranges (this month, last month, last 3 months, this year).
- **Auth**: optional single-user login at `/login` backed by `AUTH_PASSWORD`; middleware blocks pages and API routes until authenticated.

## Tables (Supabase)
- `bank_jago_statements`: raw import.
- `accounts`: seeded with “Main Account”.
- `categories`: seeded with 10 categories.
- `transactions`: normalized + categorized.
- `rules`: keyword/amount/priority rules.
- `alias_dictionary`: merchant aliases.
- `ai_categorizations`: optional audit of AI suggestions.

## Notes
- Service role key is only used server-side in API routes/server components.
- OpenAI is optional; without it the pipeline will fallback to rules/aliases and mark unmatched as `Other`.

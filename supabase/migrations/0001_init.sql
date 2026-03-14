-- Enable extensions
create extension if not exists "pgcrypto";
create extension if not exists "uuid-ossp";

-- Raw statements from Bank Jago
create table if not exists public.bank_jago_statements (
  id bigint primary key,
  created_at timestamptz default now(),
  transaction_at timestamptz,
  from_or_to text,
  remark text,
  type text check (type in ('cr','db')),
  amount numeric,
  balance numeric
);

-- Accounts
create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  bank_name text,
  created_at timestamptz default now()
);

-- Categories
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('income','expense','transfer')),
  created_at timestamptz default now()
);

-- Normalized transactions
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  source_id bigint references public.bank_jago_statements(id) on delete set null,
  account_id uuid references public.accounts(id),
  transaction_at timestamptz not null,
  description text,
  amount numeric not null,
  type text not null check (type in ('income','expense','transfer')),
  balance numeric,
  category_id uuid references public.categories(id),
  categorization_source text not null default 'none' check (categorization_source in ('manual','rule','ai','none')),
  created_at timestamptz default now()
);

create index if not exists transactions_transaction_at_idx on public.transactions (transaction_at desc);
create index if not exists transactions_category_idx on public.transactions (category_id);

-- Rules
create table if not exists public.rules (
  id uuid primary key default gen_random_uuid(),
  keyword text not null,
  min_amount numeric,
  max_amount numeric,
  category_id uuid references public.categories(id),
  priority int default 100,
  created_at timestamptz default now()
);

-- Alias / merchant normalization
create table if not exists public.alias_dictionary (
  id uuid primary key default gen_random_uuid(),
  alias text not null,
  normalized text not null,
  created_at timestamptz default now()
);

-- Optional AI categorization audit
create table if not exists public.ai_categorizations (
  id uuid primary key default gen_random_uuid(),
  transaction_id uuid references public.transactions(id) on delete cascade,
  suggested_category text,
  confidence numeric,
  model text,
  created_at timestamptz default now()
);

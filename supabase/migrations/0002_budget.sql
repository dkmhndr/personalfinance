-- Budget planning tables
create table if not exists public.budget_lines (
  id uuid primary key default gen_random_uuid(),
  period text not null check (period ~ '^[0-9]{4}-[0-9]{2}$'), -- YYYY-MM
  scenario text not null default 'base',
  type text not null check (type in ('income','expense','transfer')),
  category_id uuid references public.categories(id),
  label text not null,
  amount numeric not null,
  recurrence text not null default 'none' check (recurrence in ('none','monthly')),
  created_at timestamptz default now()
);

create index if not exists budget_lines_period_scenario_idx on public.budget_lines (period, scenario);
create index if not exists budget_lines_category_idx on public.budget_lines (category_id);

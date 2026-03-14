-- Seed accounts
insert into public.accounts (id, name, bank_name)
values
  (gen_random_uuid(), 'Main Account', 'Bank Jago')
on conflict (name) do nothing;

-- Seed categories
with c as (
  select * from (values
    ('Income', 'income'),
    ('Food', 'expense'),
    ('Transport', 'expense'),
    ('Shopping', 'expense'),
    ('Bills', 'expense'),
    ('Subscriptions', 'expense'),
    ('Health', 'expense'),
    ('Entertainment', 'expense'),
    ('Transfer', 'transfer'),
    ('Other', 'expense')
  ) as t(name, type)
)
insert into public.categories (id, name, type)
select gen_random_uuid(), name, type from c
on conflict (name) do nothing;

-- Alias dictionary
insert into public.alias_dictionary (id, alias, normalized)
values
  (gen_random_uuid(), 'WR', 'WARUNG'),
  (gen_random_uuid(), 'WRG', 'WARUNG'),
  (gen_random_uuid(), 'WRNG', 'WARUNG'),
  (gen_random_uuid(), 'WM', 'WARUNG'),
  (gen_random_uuid(), 'WARMINDO', 'WARUNG'),
  (gen_random_uuid(), 'NASGOR', 'NASI GORENG'),
  (gen_random_uuid(), 'AYG', 'AYAM GEPREK')
on conflict do nothing;

-- Seed rules
insert into public.rules (id, keyword, min_amount, max_amount, category_id, priority)
select gen_random_uuid(), keyword, min_amount, max_amount, c.id, priority
from (values
  ('GOFOOD'::text, null::numeric, null::numeric, 20::int),
  ('GRABFOOD'::text, null::numeric, null::numeric, 20::int),
  ('GOPAY'::text, null::numeric, 80000::numeric, 30::int),
  ('GRAB'::text, null::numeric, 80000::numeric, 30::int),
  ('SHOPEE'::text, null::numeric, 80000::numeric, 40::int),
  ('QRIS'::text, null::numeric, 80000::numeric, 50::int),
  ('NETFLIX'::text, null::numeric, null::numeric, 10::int),
  ('PLN'::text, null::numeric, null::numeric, 10::int),
  ('TELKOM'::text, null::numeric, null::numeric, 10::int),
  ('GOJEK'::text, null::numeric, null::numeric, 20::int),
  ('BUNGA'::text, null::numeric, null::numeric, 15::int),
  ('PAJAK BUNGA'::text, null::numeric, null::numeric, 15::int)
) as r(keyword, min_amount, max_amount, priority)
join public.categories c on c.name in (
  case r.keyword
    when 'NETFLIX' then 'Subscriptions'
    when 'PLN' then 'Bills'
    when 'TELKOM' then 'Bills'
    when 'GOJEK' then 'Transport'
    when 'BUNGA' then 'Income'
    when 'PAJAK BUNGA' then 'Bills'
    else 'Food'
  end
)
on conflict do nothing;

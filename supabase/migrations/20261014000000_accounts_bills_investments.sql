create table public.pluggy_accounts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.pluggy_items (id) on delete cascade,
  name text,
  type text,
  subtype text,
  number text,
  balance numeric(14, 2),
  currency text,
  credit_limit numeric(14, 2),
  available_credit numeric(14, 2),
  minimum_payment numeric(14, 2),
  close_date date,
  due_date date,
  brand text,
  raw jsonb,
  updated_at timestamptz not null default now()
);

create table public.pluggy_bills (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.pluggy_items (id) on delete cascade,
  account_id text not null references public.pluggy_accounts (id) on delete cascade,
  due_date date,
  total numeric(14, 2),
  minimum_payment numeric(14, 2),
  currency text,
  raw jsonb,
  updated_at timestamptz not null default now()
);

create table public.pluggy_investments (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.pluggy_items (id) on delete cascade,
  name text,
  type text,
  subtype text,
  issuer text,
  balance numeric(16, 2),
  amount_original numeric(16, 2),
  amount_profit numeric(16, 2),
  amount_withdrawal numeric(16, 2),
  quantity numeric(20, 8),
  unit_value numeric(20, 8),
  annual_rate numeric(10, 4),
  last_month_rate numeric(10, 4),
  last_twelve_months_rate numeric(10, 4),
  due_date date,
  status text,
  currency text,
  raw jsonb,
  updated_at timestamptz not null default now()
);

create index pluggy_accounts_user_idx on public.pluggy_accounts (user_id);
create index pluggy_bills_user_idx on public.pluggy_bills (user_id, due_date desc);
create index pluggy_bills_account_idx on public.pluggy_bills (account_id);
create index pluggy_investments_user_idx on public.pluggy_investments (user_id);

alter table public.pluggy_accounts enable row level security;
alter table public.pluggy_bills enable row level security;
alter table public.pluggy_investments enable row level security;

create policy pluggy_accounts_read_own on public.pluggy_accounts
  for select using (auth.uid() = user_id);
create policy pluggy_bills_read_own on public.pluggy_bills
  for select using (auth.uid() = user_id);
create policy pluggy_investments_read_own on public.pluggy_investments
  for select using (auth.uid() = user_id);

alter publication supabase_realtime add table public.pluggy_accounts;
alter publication supabase_realtime add table public.pluggy_bills;

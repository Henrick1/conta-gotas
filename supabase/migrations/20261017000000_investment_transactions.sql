create table public.pluggy_investment_transactions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text not null references public.pluggy_items (id) on delete cascade,
  investment_id text not null references public.pluggy_investments (id) on delete cascade,
  type text,
  movement_type text,
  date date,
  trade_date date,
  description text,
  quantity numeric(20, 8),
  unit_value numeric(20, 8),
  amount numeric(16, 2),
  net_amount numeric(16, 2),
  raw jsonb,
  updated_at timestamptz not null default now()
);

create index pluggy_inv_tx_user_idx on public.pluggy_investment_transactions (user_id, date desc);
create index pluggy_inv_tx_inv_idx on public.pluggy_investment_transactions (investment_id);

alter table public.pluggy_investment_transactions enable row level security;

create policy pluggy_inv_tx_read_own on public.pluggy_investment_transactions
  for select using (auth.uid() = user_id);

create table public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.pluggy_items (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  connector_name text,
  status text,
  last_sync_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.transactions (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  item_id text references public.pluggy_items (id) on delete set null,
  account_id text,
  date date not null,
  description text not null,
  amount numeric(12, 2) not null check (amount > 0),
  category text,
  pluggy_category text,
  ai boolean not null default false,
  manual boolean not null default false,
  source text not null default 'manual' check (source in ('pluggy', 'import', 'manual')),
  created_at timestamptz not null default now()
);

create index transactions_user_date_idx on public.transactions (user_id, date desc);
create index transactions_user_pending_idx on public.transactions (user_id) where category is null;
create index pluggy_items_user_idx on public.pluggy_items (user_id);

alter table public.settings enable row level security;
alter table public.pluggy_items enable row level security;
alter table public.transactions enable row level security;

create policy settings_own on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy pluggy_items_read_own on public.pluggy_items
  for select using (auth.uid() = user_id);

create policy transactions_own on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.transactions;
alter publication supabase_realtime add table public.pluggy_items;

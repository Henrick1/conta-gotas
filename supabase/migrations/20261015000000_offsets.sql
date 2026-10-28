create table public.offsets (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  amount numeric(12, 2) not null check (amount > 0),
  note text,
  allocations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index offsets_user_date_idx on public.offsets (user_id, date desc);

alter table public.offsets enable row level security;

create policy offsets_own on public.offsets
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table public.offsets
  add column person text,
  add column status text not null default 'received' check (status in ('pending', 'received')),
  add column received_at date;

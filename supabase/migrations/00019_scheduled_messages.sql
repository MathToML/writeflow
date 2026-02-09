create table public.scheduled_messages (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  message text not null,
  deliver_at timestamptz not null,
  status text default 'pending' not null,  -- pending | delivered | cancelled
  delivered_at timestamptz,
  created_at timestamptz default now() not null
);

create index idx_scheduled_messages_user on public.scheduled_messages(user_id, status);

-- RLS
alter table public.scheduled_messages enable row level security;
create policy "Users see own scheduled messages"
  on public.scheduled_messages for select using (auth.uid() = user_id);
create policy "Users create own scheduled messages"
  on public.scheduled_messages for insert with check (auth.uid() = user_id);
create policy "Users update own scheduled messages"
  on public.scheduled_messages for update using (auth.uid() = user_id);

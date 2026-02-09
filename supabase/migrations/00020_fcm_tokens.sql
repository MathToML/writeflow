create table public.fcm_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  token text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, token)
);

create index idx_fcm_tokens_user_id on public.fcm_tokens(user_id);

alter table public.fcm_tokens enable row level security;
create policy "Users manage own tokens" on public.fcm_tokens
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Pending questions table for server-side auto-proceed
create table public.pending_questions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  dump_id uuid references public.dumps(id) on delete cascade not null,
  timezone text default 'Asia/Seoul' not null,
  status text default 'pending' not null,  -- pending | resolved | auto_proceeded
  resolved_at timestamptz,
  created_at timestamptz default now() not null
);

create index idx_pending_questions_user on public.pending_questions(user_id, status);

-- RLS
alter table public.pending_questions enable row level security;

create policy "Users can view own pending questions"
  on public.pending_questions for select
  using (auth.uid() = user_id);

create policy "Users can insert own pending questions"
  on public.pending_questions for insert
  with check (auth.uid() = user_id);

create policy "Users can update own pending questions"
  on public.pending_questions for update
  using (auth.uid() = user_id);

-- Enable Realtime for dumps table (for auto-proceed updates)
alter publication supabase_realtime add table public.dumps;

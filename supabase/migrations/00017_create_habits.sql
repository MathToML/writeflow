-- Habit tracking: habits + habit_logs

-- habits table
create table public.habits (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  icon text default '✅',
  color text default 'green',
  archived_at timestamptz,
  created_at timestamptz default now() not null
);

-- habit_logs table
create table public.habit_logs (
  id uuid default gen_random_uuid() primary key,
  habit_id uuid references public.habits(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  logged_date date not null,
  note text,
  value numeric default 1,
  created_at timestamptz default now() not null
);

-- Indexes
create index idx_habits_user on public.habits(user_id);
create index idx_habit_logs_lookup on public.habit_logs(habit_id, logged_date desc);
create index idx_habit_logs_user_date on public.habit_logs(user_id, logged_date desc);

-- RLS
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

-- habits policies
create policy "Users can view own habits" on public.habits for select using (auth.uid() = user_id);
create policy "Users can create own habits" on public.habits for insert with check (auth.uid() = user_id);
create policy "Users can update own habits" on public.habits for update using (auth.uid() = user_id);
create policy "Users can delete own habits" on public.habits for delete using (auth.uid() = user_id);

-- habit_logs policies
create policy "Users can view own habit_logs" on public.habit_logs for select using (auth.uid() = user_id);
create policy "Users can create own habit_logs" on public.habit_logs for insert with check (auth.uid() = user_id);
create policy "Users can update own habit_logs" on public.habit_logs for update using (auth.uid() = user_id);
create policy "Users can delete own habit_logs" on public.habit_logs for delete using (auth.uid() = user_id);

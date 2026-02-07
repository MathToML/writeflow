-- RLS 활성화 및 정책 설정

alter table public.profiles enable row level security;
alter table public.dumps enable row level security;
alter table public.events enable row level security;
alter table public.tasks enable row level security;
alter table public.records enable row level security;
alter table public.daily_summaries enable row level security;

-- profiles
create policy "Users can view own profile" on public.profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = id);

-- dumps
create policy "Users can view own dumps" on public.dumps for select using (auth.uid() = user_id);
create policy "Users can create own dumps" on public.dumps for insert with check (auth.uid() = user_id);
create policy "Users can update own dumps" on public.dumps for update using (auth.uid() = user_id);
create policy "Users can delete own dumps" on public.dumps for delete using (auth.uid() = user_id);

-- events
create policy "Users can view own events" on public.events for select using (auth.uid() = user_id);
create policy "Users can create own events" on public.events for insert with check (auth.uid() = user_id);
create policy "Users can update own events" on public.events for update using (auth.uid() = user_id);
create policy "Users can delete own events" on public.events for delete using (auth.uid() = user_id);

-- tasks
create policy "Users can view own tasks" on public.tasks for select using (auth.uid() = user_id);
create policy "Users can create own tasks" on public.tasks for insert with check (auth.uid() = user_id);
create policy "Users can update own tasks" on public.tasks for update using (auth.uid() = user_id);
create policy "Users can delete own tasks" on public.tasks for delete using (auth.uid() = user_id);

-- records
create policy "Users can view own records" on public.records for select using (auth.uid() = user_id);
create policy "Users can create own records" on public.records for insert with check (auth.uid() = user_id);
create policy "Users can update own records" on public.records for update using (auth.uid() = user_id);
create policy "Users can delete own records" on public.records for delete using (auth.uid() = user_id);

-- daily_summaries
create policy "Users can view own summaries" on public.daily_summaries for select using (auth.uid() = user_id);
create policy "Users can create own summaries" on public.daily_summaries for insert with check (auth.uid() = user_id);
create policy "Users can update own summaries" on public.daily_summaries for update using (auth.uid() = user_id);

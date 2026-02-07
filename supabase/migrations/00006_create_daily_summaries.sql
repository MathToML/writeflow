-- daily_summaries: 하루 요약
create table public.daily_summaries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  date date not null,
  summary_text text,
  stats jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  unique(user_id, date)
);

create index idx_daily_summaries_user_date on public.daily_summaries(user_id, date desc);

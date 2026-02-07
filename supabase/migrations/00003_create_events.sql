-- events: 일정
create type public.event_status as enum ('active', 'cancelled', 'completed');

create table public.events (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  dump_id uuid references public.dumps(id) on delete set null,
  title text not null,
  description text,
  start_at timestamptz not null,
  end_at timestamptz,
  location text,
  attendees jsonb default '[]'::jsonb,
  status public.event_status default 'active' not null,
  context jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_events_user_id on public.events(user_id);
create index idx_events_start_at on public.events(start_at);
create index idx_events_user_date on public.events(user_id, start_at);

create trigger update_events_updated_at
  before update on public.events
  for each row execute function public.update_updated_at_column();

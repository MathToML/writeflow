-- dumps: brain dump 원본 데이터
create type public.dump_type as enum ('text', 'voice', 'image');

create table public.dumps (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  type public.dump_type default 'text' not null,
  raw_content text not null,
  transcript text,
  ai_analysis jsonb default '{}'::jsonb,
  location point,
  created_at timestamptz default now() not null
);

create index idx_dumps_user_id on public.dumps(user_id);
create index idx_dumps_created_at on public.dumps(created_at desc);
create index idx_dumps_user_date on public.dumps(user_id, created_at desc);

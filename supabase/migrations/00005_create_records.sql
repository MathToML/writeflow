-- records: 작업 기억 (참조 정보)
create table public.records (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  dump_id uuid references public.dumps(id) on delete set null,
  category text default 'general',
  title text not null,
  content jsonb default '{}'::jsonb,
  tags text[] default '{}',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_records_user_id on public.records(user_id);
create index idx_records_category on public.records(user_id, category);

create trigger update_records_updated_at
  before update on public.records
  for each row execute function public.update_updated_at_column();

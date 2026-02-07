-- tasks: 할 일
create type public.task_status as enum ('pending', 'in_progress', 'done', 'deferred');
create type public.context_type as enum (
  'location_dependent', 'desk_work', 'communication', 'errand', 'quick', 'other'
);

create table public.tasks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  dump_id uuid references public.dumps(id) on delete set null,
  title text not null,
  description text,
  importance smallint default 3 check (importance >= 1 and importance <= 5),
  context_type public.context_type default 'other',
  due_date date,
  related_people jsonb default '[]'::jsonb,
  status public.task_status default 'pending' not null,
  parent_task_id uuid references public.tasks(id) on delete set null,
  is_ticket boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index idx_tasks_user_id on public.tasks(user_id);
create index idx_tasks_status on public.tasks(user_id, status);
create index idx_tasks_due_date on public.tasks(user_id, due_date);

create trigger update_tasks_updated_at
  before update on public.tasks
  for each row execute function public.update_updated_at_column();

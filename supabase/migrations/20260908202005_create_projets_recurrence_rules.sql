create table public.projets_recurrence_rules (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  workspace_id uuid not null references public.projets_workspaces(id) on delete cascade,
  frequency text not null check (frequency = any (array['daily'::text, 'weekly'::text, 'monthly'::text])),
  interval int not null default 1,
  start_date date not null,
  end_date date,
  phase_id text,
  title text not null,
  priority text not null default 'normal'::text check (priority = any (array['high'::text, 'normal'::text, 'low'::text])),
  item_type text not null check (item_type = any (array['task'::text, 'request'::text, 'incident'::text, 'maintenance'::text, 'deliverable'::text, 'milestone'::text, 'decision'::text, 'risk'::text])),
  created_at timestamptz not null default now()
);

alter table public.projets_recurrence_rules enable row level security;

create policy "own recurrence rules" on public.projets_recurrence_rules
  for all
  using (user_hash = ((current_setting('request.headers'::text, true))::json ->> 'x-user-hash'::text))
  with check (user_hash = ((current_setting('request.headers'::text, true))::json ->> 'x-user-hash'::text));

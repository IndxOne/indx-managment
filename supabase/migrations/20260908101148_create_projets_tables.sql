-- INDXONE Projets (Lot 5) : tables préfixées projets_* dans le projet
-- indxone-Hub, réutilisé pour limiter les coûts (décision explicite, cf.
-- discussion avec l'utilisateur). Isolation par en-tête x-user-hash,
-- même mécanisme que sync_snapshots déjà en place dans ce projet.

create table if not exists public.projets_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  name text not null,
  description text,
  kind text not null check (kind in ('run','project')),
  approach text not null check (approach in ('simple','it_ops','project_amoa','product_tech','management')),
  collaboration_mode text not null default 'solo' check (collaboration_mode in ('solo','team')),
  preset_version integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projets_actions (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  workspace_id uuid not null references public.projets_workspaces(id) on delete cascade,
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo','doing','waiting','done')),
  priority text not null default 'normal' check (priority in ('high','normal','low')),
  item_type text not null check (item_type in ('task','request','incident','maintenance','deliverable','milestone')),
  phase_id text,
  schedule jsonb not null default '{"granularity":"none"}'::jsonb,
  assignee_ids text[] not null default '{}',
  tags text[] not null default '{}',
  source_note_id text,
  recurrence_rule_id text,
  waiting_since timestamptz,
  waiting_reminder jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists projets_workspaces_user_hash_idx on public.projets_workspaces(user_hash);
create index if not exists projets_actions_user_hash_idx on public.projets_actions(user_hash);
create index if not exists projets_actions_workspace_id_idx on public.projets_actions(workspace_id);

alter table public.projets_workspaces enable row level security;
alter table public.projets_actions enable row level security;

create policy "own workspaces" on public.projets_workspaces
  for all
  using (user_hash = ((current_setting('request.headers', true))::json ->> 'x-user-hash'))
  with check (user_hash = ((current_setting('request.headers', true))::json ->> 'x-user-hash'));

create policy "own actions" on public.projets_actions
  for all
  using (user_hash = ((current_setting('request.headers', true))::json ->> 'x-user-hash'))
  with check (user_hash = ((current_setting('request.headers', true))::json ->> 'x-user-hash'));

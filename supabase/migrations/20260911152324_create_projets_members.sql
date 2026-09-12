-- Lot 8A : membres d'un espace — étiquettes d'assignation/filtrage, PAS des
-- comptes utilisateur (aucun rôle, aucune permission différenciée). Même
-- patron RLS que les autres tables projets_* : isolation par x-user-hash,
-- pas par identité signée (cf. note de sécurité dans supabase-store.tsx).
--
-- Désactivation plutôt que suppression : une action déjà assignée à un
-- membre ne doit jamais perdre silencieusement son assigneeId. Aucune
-- contrainte FK entre projets_actions.assignee_ids et projets_members.id
-- (assignee_ids est déjà un text[] libre, pas une clé étrangère) — un
-- membre désactivé ou même supprimé plus tard ne casse donc jamais la
-- lecture d'une action existante.
create table if not exists public.projets_members (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  workspace_id uuid not null references public.projets_workspaces(id) on delete cascade,
  display_name text not null,
  email text,
  avatar_url text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists projets_members_user_hash_idx on public.projets_members(user_hash);
create index if not exists projets_members_workspace_id_idx on public.projets_members(workspace_id);

alter table public.projets_members enable row level security;

create policy "own members" on public.projets_members
  for all
  using (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'))
  with check (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'));

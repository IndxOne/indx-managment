-- Cible Auth pour environnement vide (staging) : Supabase Auth (auth.uid())
-- devient l'autorité d'accès, en remplacement du mécanisme x-user-hash.
--
-- Portée : projets_workspaces.owner_id -> auth.users.id, accès propriétaire
-- via auth.uid(), projets_members conservée telle quelle (étiquettes
-- d'assignation métier, non authentifiées, INCHANGÉE), projets_workspace_members
-- créée pour porter l'appartenance authentifiée réelle à un espace — la
-- collaboration (collaboration_mode='team', déjà présente depuis
-- create_projets_tables.sql) n'avait jusqu'ici aucune traduction RLS réelle.
--
-- projets_carnet_notes et projets_hub_settings n'ont pas de workspace_id
-- (portée personnelle, pas d'espace) : owner_id direct, pas de partage.
--
-- NE PAS appliquer tel quel à un environnement portant des données réelles
-- (production) : owner_id est NOT NULL sans étape de backfill, ce qui
-- suppose une base vide. Le rattachement user_hash -> auth.uid() pour des
-- données existantes est un lot séparé, non traité ici.

-- ===================================================================
-- 1. projets_workspaces.owner_id
-- ===================================================================
alter table public.projets_workspaces
  add column owner_id uuid not null references auth.users(id) on delete cascade;

create index if not exists projets_workspaces_owner_id_idx on public.projets_workspaces(owner_id);

-- ===================================================================
-- 2. projets_workspace_members (collaboration authentifiée)
-- ===================================================================
create table public.projets_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.projets_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','editor','viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists projets_workspace_members_workspace_id_idx on public.projets_workspace_members(workspace_id);
create index if not exists projets_workspace_members_user_id_idx on public.projets_workspace_members(user_id);

alter table public.projets_workspace_members enable row level security;

-- ===================================================================
-- 3. Fonctions utilitaires SECURITY DEFINER
--    - schéma non exposé aux Data APIs (fonctions, pas des tables)
--    - auth.uid() vérifié à l'intérieur (aucun paramètre d'identité fourni
--      par l'appelant, impossible à falsifier depuis le client)
--    - EXECUTE révoqué de public/anon, accordé uniquement à authenticated
-- ===================================================================
create or replace function public.is_workspace_owner(ws_id uuid) returns boolean
  language sql stable security definer set search_path = ''
  as $$
    select exists (
      select 1 from public.projets_workspaces w
      where w.id = ws_id and w.owner_id = auth.uid()
    );
  $$;

create or replace function public.workspace_role(ws_id uuid) returns text
  language sql stable security definer set search_path = ''
  as $$
    select coalesce(
      (select 'owner' from public.projets_workspaces w where w.id = ws_id and w.owner_id = auth.uid()),
      (select m.role from public.projets_workspace_members m where m.workspace_id = ws_id and m.user_id = auth.uid())
    );
  $$;

revoke all on function public.is_workspace_owner(uuid), public.workspace_role(uuid) from public, anon;
grant execute on function public.is_workspace_owner(uuid), public.workspace_role(uuid) to authenticated;

-- ===================================================================
-- 4. projets_workspace_members — policies SELECT/INSERT/UPDATE/DELETE
-- ===================================================================
create policy "workspace_members_select" on public.projets_workspace_members
  for select
  using (public.workspace_role(workspace_id) is not null);

create policy "workspace_members_insert" on public.projets_workspace_members
  for insert
  with check (public.is_workspace_owner(workspace_id));

create policy "workspace_members_update" on public.projets_workspace_members
  for update
  using (public.is_workspace_owner(workspace_id))
  with check (public.is_workspace_owner(workspace_id));

create policy "workspace_members_delete" on public.projets_workspace_members
  for delete
  using (public.is_workspace_owner(workspace_id) or user_id = auth.uid());

-- ===================================================================
-- 5. projets_workspaces — remplace "own workspaces" (FOR ALL)
-- ===================================================================
drop policy if exists "own workspaces" on public.projets_workspaces;

create policy "workspaces_select" on public.projets_workspaces
  for select
  using (owner_id = auth.uid() or public.workspace_role(id) is not null);

create policy "workspaces_insert" on public.projets_workspaces
  for insert
  with check (owner_id = auth.uid());

create policy "workspaces_update" on public.projets_workspaces
  for update
  using (owner_id = auth.uid() or public.workspace_role(id) = 'editor')
  with check (owner_id = auth.uid() or public.workspace_role(id) = 'editor');

create policy "workspaces_delete" on public.projets_workspaces
  for delete
  using (owner_id = auth.uid());

-- ===================================================================
-- 6. projets_actions — owner/editor en écriture, tout membre en lecture
-- ===================================================================
drop policy if exists "own actions" on public.projets_actions;

create policy "actions_select" on public.projets_actions
  for select using (public.workspace_role(workspace_id) is not null);
create policy "actions_insert" on public.projets_actions
  for insert with check (public.workspace_role(workspace_id) in ('owner','editor'));
create policy "actions_update" on public.projets_actions
  for update
  using (public.workspace_role(workspace_id) in ('owner','editor'))
  with check (public.workspace_role(workspace_id) in ('owner','editor'));
create policy "actions_delete" on public.projets_actions
  for delete using (public.workspace_role(workspace_id) in ('owner','editor'));

-- ===================================================================
-- 7. projets_recurrence_rules — même patron que actions
-- ===================================================================
drop policy if exists "own recurrence rules" on public.projets_recurrence_rules;

create policy "recurrence_rules_select" on public.projets_recurrence_rules
  for select using (public.workspace_role(workspace_id) is not null);
create policy "recurrence_rules_insert" on public.projets_recurrence_rules
  for insert with check (public.workspace_role(workspace_id) in ('owner','editor'));
create policy "recurrence_rules_update" on public.projets_recurrence_rules
  for update
  using (public.workspace_role(workspace_id) in ('owner','editor'))
  with check (public.workspace_role(workspace_id) in ('owner','editor'));
create policy "recurrence_rules_delete" on public.projets_recurrence_rules
  for delete using (public.workspace_role(workspace_id) in ('owner','editor'));

-- ===================================================================
-- 8. projets_members (étiquettes d'assignation, USAGE INCHANGÉ) —
--    même patron d'accès que les autres tables enfants d'un espace
-- ===================================================================
drop policy if exists "own members" on public.projets_members;

create policy "members_select" on public.projets_members
  for select using (public.workspace_role(workspace_id) is not null);
create policy "members_insert" on public.projets_members
  for insert with check (public.workspace_role(workspace_id) in ('owner','editor'));
create policy "members_update" on public.projets_members
  for update
  using (public.workspace_role(workspace_id) in ('owner','editor'))
  with check (public.workspace_role(workspace_id) in ('owner','editor'));
create policy "members_delete" on public.projets_members
  for delete using (public.workspace_role(workspace_id) in ('owner','editor'));

-- ===================================================================
-- 9. projets_carnet_notes / projets_hub_settings — portée personnelle,
--    pas de workspace_id, owner_id direct, jamais partagées
-- ===================================================================
alter table public.projets_carnet_notes
  add column owner_id uuid not null references auth.users(id) on delete cascade;
create index if not exists projets_carnet_notes_owner_id_idx on public.projets_carnet_notes(owner_id);

drop policy if exists "own carnet notes" on public.projets_carnet_notes;
create policy "carnet_notes_select" on public.projets_carnet_notes for select using (owner_id = auth.uid());
create policy "carnet_notes_insert" on public.projets_carnet_notes for insert with check (owner_id = auth.uid());
create policy "carnet_notes_update" on public.projets_carnet_notes for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "carnet_notes_delete" on public.projets_carnet_notes for delete using (owner_id = auth.uid());

alter table public.projets_hub_settings
  add column owner_id uuid references auth.users(id) on delete cascade;
-- Nullable : la PK reste user_hash pour l'instant (changement de PK hors
-- périmètre de ce lot ; à traiter au lot de rattachement).

drop policy if exists "own hub settings" on public.projets_hub_settings;
create policy "hub_settings_select" on public.projets_hub_settings for select using (owner_id = auth.uid());
create policy "hub_settings_insert" on public.projets_hub_settings for insert with check (owner_id = auth.uid());
create policy "hub_settings_update" on public.projets_hub_settings for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "hub_settings_delete" on public.projets_hub_settings for delete using (owner_id = auth.uid());

-- ===================================================================
-- 11. projets_push_subscriptions — owner_id ajouté EN COMPLÉMENT de
--     user_hash, jamais en remplacement : cette table est écrite par
--     push-subscription.ts, code applicatif déployé identique en
--     production ET en staging. user_hash reste NOT NULL et continue
--     d'être envoyé (identifiant d'appareil local, indépendant de l'auth,
--     cf. push-subscription.ts) : retirer cette colonne casserait la
--     production, qui n'a pas cette migration. owner_id (nullable) est
--     rempli seulement quand une session Auth existe — jamais le cas sur
--     production aujourd'hui (AuthScreen non branché), donc sans risque.
-- ===================================================================
alter table public.projets_push_subscriptions
  add column owner_id uuid references auth.users(id) on delete cascade;

drop policy if exists "own push subscriptions" on public.projets_push_subscriptions;

create policy "push_subscriptions_select" on public.projets_push_subscriptions
  for select using (owner_id = auth.uid());
create policy "push_subscriptions_insert" on public.projets_push_subscriptions
  for insert with check (owner_id = auth.uid());
create policy "push_subscriptions_update" on public.projets_push_subscriptions
  for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "push_subscriptions_delete" on public.projets_push_subscriptions
  for delete using (owner_id = auth.uid());

revoke all on public.projets_push_subscriptions from anon;
-- authenticated garde ses privilèges table par défaut (RLS filtre par
-- ligne). service_role bypass RLS nativement : l'Edge Function
-- projets-push-reminders (déjà en service_role) n'a besoin d'aucun
-- changement pour continuer à lire tous les abonnements.

-- ===================================================================
-- 12. Révocation des privilèges anon inutiles sur les 7 tables cible
--     (défense en profondeur, anticipe l'exigence Supabase du 30/10/2026
--     sur l'exposition explicite aux Data APIs)
-- ===================================================================
revoke all on public.projets_workspaces, public.projets_actions, public.projets_recurrence_rules,
  public.projets_carnet_notes, public.projets_hub_settings, public.projets_members,
  public.projets_workspace_members
  from anon;

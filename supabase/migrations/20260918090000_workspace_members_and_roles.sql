-- Lot 0 (gate Auth/RLS) — réconciliation staging -> repo, option 3 (voir
-- décision utilisateur du 18/09/2026). Le modèle "owner_id OR user_hash"
-- additif de 20260916130000 gère un propriétaire, pas une collaboration :
-- il est remplacé ici par un modèle multi-utilisateurs par espace
-- (projets_workspace_members + rôles owner/editor/viewer), déjà validé et
-- éprouvé sur le projet staging sukfvzrwupuswtqxwlmc (5 migrations
-- appliquées hors dépôt le 15/09/2026, inventoriées puis consolidées ici en
-- une seule migration versionnée, alignée sur la convention du dépôt).
--
-- Contrairement à la version staging d'origine (target_auth_owner_workspace_members,
-- qui posait owner_id NOT NULL sur une base vide), le dépôt a déjà owner_id
-- NULLABLE depuis 20260916130000 : compatible avec des lignes existantes
-- (production, utilisateurs non-auth). Aucune étape de backfill requise ici.
--
-- Cette migration DROP les 14 anciennes policies (7 legacy "own X"
-- user_hash-only + 7 "own X by auth" owner_id-OR-user_hash) et les remplace
-- par des policies par opération (SELECT/INSERT/UPDATE/DELETE), condition
-- du modèle cible : un rôle vit dans projets_workspace_members, jamais dans
-- user_metadata (falsifiable côté client).
--
-- Cutover assumé : après cette migration, l'accès par x-user-hash disparaît
-- sur les 7 tables (déjà le comportement observé/validé sur staging). Les
-- lignes user_hash existantes restent lisibles uniquement après réclamation
-- (cf. 20260918090100_claim_legacy_user_hash.sql) — c'est la trajectoire
-- explicitement demandée : ne pas maintenir indéfiniment les policies
-- permissives legacy.

-- ===================================================================
-- 1. projets_workspace_members (appartenance authentifiée à un espace)
--
-- role exclut volontairement 'owner' : l'autorité de propriétaire est
-- exclusivement portée par projets_workspaces.owner_id (vérifié par
-- is_workspace_owner()), jamais par une ligne de cette table — même le
-- propriétaire n'y a pas de ligne. Un membre ne peut donc jamais se
-- retrouver avec le libellé 'owner' via une simple ligne d'appartenance
-- (source de confusion sans élévation réelle : workspace_role() ne
-- consulte cette table qu'en second, après avoir écarté le propriétaire
-- réel — mais autant écarter l'ambiguïté à la racine).
-- ===================================================================
create table if not exists public.projets_workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.projets_workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('editor','viewer')),
  created_at timestamptz not null default now(),
  unique (workspace_id, user_id)
);

create index if not exists projets_workspace_members_workspace_id_idx on public.projets_workspace_members(workspace_id);
create index if not exists projets_workspace_members_user_id_idx on public.projets_workspace_members(user_id);

alter table public.projets_workspace_members enable row level security;

create index if not exists idx_projets_hub_settings_owner_id on public.projets_hub_settings(owner_id);

-- ===================================================================
-- 2. Fonctions utilitaires SECURITY DEFINER
--    - schéma non exposé aux Data APIs (fonctions, pas des tables)
--    - auth.uid() vérifié à l'intérieur (aucun paramètre d'identité fourni
--      par l'appelant, impossible à falsifier depuis le client)
--    - search_path='' : aucune résolution ambiguë de nom d'objet
--    - EXECUTE réservé à authenticated (jamais anon/public)
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
-- 3. workspace_id non réaffectable (exigence du modèle cible) : un
--    UPDATE ne peut jamais déplacer une ligne d'un espace vers un autre,
--    même pour un owner/editor légitime des deux côtés. USING/WITH CHECK
--    seuls ne peuvent pas comparer OLD et NEW : trigger dédié.
-- ===================================================================
create or replace function public.prevent_workspace_reassignment() returns trigger
  language plpgsql security invoker set search_path = ''
  as $$
  begin
    if new.workspace_id is distinct from old.workspace_id then
      raise exception 'workspace_id non modifiable après création (ligne %, ancien %, nouveau %)',
        old.id, old.workspace_id, new.workspace_id;
    end if;
    return new;
  end;
  $;

revoke all on function public.prevent_workspace_reassignment() from public, anon, authenticated;
grant execute on function public.prevent_workspace_reassignment() to service_role;

drop trigger if exists prevent_workspace_reassignment on public.projets_actions;
create trigger prevent_workspace_reassignment before update on public.projets_actions
  for each row execute function public.prevent_workspace_reassignment();

drop trigger if exists prevent_workspace_reassignment on public.projets_recurrence_rules;
create trigger prevent_workspace_reassignment before update on public.projets_recurrence_rules
  for each row execute function public.prevent_workspace_reassignment();

drop trigger if exists prevent_workspace_reassignment on public.projets_members;
create trigger prevent_workspace_reassignment before update on public.projets_members
  for each row execute function public.prevent_workspace_reassignment();

-- owner_id porte l'autorité du workspace. Les policies seules ne peuvent
-- pas comparer OLD et NEW : un editor autorisé en UPDATE pourrait sinon
-- se désigner lui-même comme owner. Les appels applicatifs (anon/authenticated)
-- ne peuvent jamais transférer cette autorité ; une opération administrative
-- explicite via service_role/postgres reste possible.
create or replace function public.prevent_workspace_owner_reassignment() returns trigger
  language plpgsql security invoker set search_path = ''
  as $
  begin
    if current_user in ('anon', 'authenticated')
       and new.owner_id is distinct from old.owner_id then
      raise exception 'owner_id du workspace non modifiable depuis un rôle applicatif (workspace %, ancien %, nouveau %)',
        old.id, old.owner_id, new.owner_id;
    end if;
    return new;
  end;
  $;

revoke all on function public.prevent_workspace_owner_reassignment() from public, anon, authenticated;
grant execute on function public.prevent_workspace_owner_reassignment() to service_role;

drop trigger if exists prevent_workspace_owner_reassignment on public.projets_workspaces;
create trigger prevent_workspace_owner_reassignment
  before update of owner_id on public.projets_workspaces
  for each row execute function public.prevent_workspace_owner_reassignment();

-- ===================================================================
-- 4. projets_workspace_members — policies
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
  using (public.is_workspace_owner(workspace_id) or user_id = (select auth.uid()));

-- ===================================================================
-- 5. projets_workspaces — remplace "own workspaces" + "own workspaces by auth"
-- ===================================================================
drop policy if exists "own workspaces" on public.projets_workspaces;
drop policy if exists "own workspaces by auth" on public.projets_workspaces;

create policy "workspaces_select" on public.projets_workspaces
  for select
  using (owner_id = (select auth.uid()) or public.workspace_role(id) is not null);

create policy "workspaces_insert" on public.projets_workspaces
  for insert
  with check (owner_id = (select auth.uid()));

create policy "workspaces_update" on public.projets_workspaces
  for update
  using (owner_id = (select auth.uid()) or public.workspace_role(id) = 'editor')
  with check (owner_id = (select auth.uid()) or public.workspace_role(id) = 'editor');

create policy "workspaces_delete" on public.projets_workspaces
  for delete
  using (owner_id = (select auth.uid()));

-- ===================================================================
-- 6. projets_actions — owner/editor en écriture, tout membre en lecture
-- ===================================================================
drop policy if exists "own actions" on public.projets_actions;
drop policy if exists "own actions by auth" on public.projets_actions;

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
drop policy if exists "own recurrence rules by auth" on public.projets_recurrence_rules;

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
-- 8. projets_members (étiquettes d'assignation métier) — même patron
-- ===================================================================
drop policy if exists "own members" on public.projets_members;
drop policy if exists "own members by auth" on public.projets_members;

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
drop policy if exists "own carnet notes" on public.projets_carnet_notes;
drop policy if exists "own carnet notes by auth" on public.projets_carnet_notes;

create policy "carnet_notes_select" on public.projets_carnet_notes for select using (owner_id = (select auth.uid()));
create policy "carnet_notes_insert" on public.projets_carnet_notes for insert with check (owner_id = (select auth.uid()));
create policy "carnet_notes_update" on public.projets_carnet_notes for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "carnet_notes_delete" on public.projets_carnet_notes for delete using (owner_id = (select auth.uid()));

drop policy if exists "own hub settings" on public.projets_hub_settings;
drop policy if exists "own hub settings by auth" on public.projets_hub_settings;

create policy "hub_settings_select" on public.projets_hub_settings for select using (owner_id = (select auth.uid()));
create policy "hub_settings_insert" on public.projets_hub_settings for insert with check (owner_id = (select auth.uid()));
create policy "hub_settings_update" on public.projets_hub_settings for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "hub_settings_delete" on public.projets_hub_settings for delete using (owner_id = (select auth.uid()));

-- ===================================================================
-- 10. projets_push_subscriptions — owner_id en complément de user_hash
--     (identifiant d'appareil local indépendant de l'auth, cf.
--     push-subscription.ts) : user_hash reste NOT NULL et continue d'être
--     envoyé. owner_id nullable, rempli seulement si session Auth active.
-- ===================================================================
drop policy if exists "own push subscriptions" on public.projets_push_subscriptions;
drop policy if exists "own push subscriptions by auth" on public.projets_push_subscriptions;

create policy "push_subscriptions_select" on public.projets_push_subscriptions
  for select using (owner_id = (select auth.uid()));
create policy "push_subscriptions_insert" on public.projets_push_subscriptions
  for insert with check (owner_id = (select auth.uid()));
create policy "push_subscriptions_update" on public.projets_push_subscriptions
  for update using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "push_subscriptions_delete" on public.projets_push_subscriptions
  for delete using (owner_id = (select auth.uid()));

-- ===================================================================
-- 11. Défense en profondeur : révocation anon sur les 8 tables cible
--     (anticipe l'exigence Supabase du 30/10/2026 sur l'exposition
--     explicite aux Data APIs)
-- ===================================================================
revoke all on public.projets_workspaces, public.projets_actions, public.projets_recurrence_rules,
  public.projets_carnet_notes, public.projets_hub_settings, public.projets_members,
  public.projets_push_subscriptions, public.projets_workspace_members
  from anon;

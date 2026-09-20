-- HOTFIX (20/09/2026, décision utilisateur explicite) — pas un rollback du
-- Lot 0 : le modèle workspace_members / Auth / claim_legacy_user_hash()
-- reste intégralement en place. Corrige une régression de production
-- découverte en testant V3 avec des données réelles sur indxone-Hub :
--
-- 1. `workspace_members_and_roles` (20260918090000) a fait `revoke all ...
--    from anon` sur les 7 tables V2 SANS régénérer d'accès legacy par
--    x-user-hash dans les nouvelles policies (elles ne testent plus que
--    owner_id/workspace_role). Base réelle : 35 workspaces legacy, 0
--    utilisateur Auth → plus personne ne pouvait accéder à ses données
--    tant qu'il ne s'était pas connecté ET n'avait pas réclamé son hash.
-- 2. `hide_user_hash_from_collaborators` (20260919120000) restreint le
--    SELECT de `authenticated` à une liste de colonnes explicite (sans
--    user_hash) sur les 7 tables (y compris les 3 à portée personnelle :
--    carnet_notes, hub_settings, push_subscriptions). Le client fait
--    `.select("*")` (supabase-store.tsx) : Postgres refuse `SELECT *` dès
--    qu'un rôle n'a qu'un privilège colonne-par-colonne partiel →
--    "permission denied for table" pour tout utilisateur authentifié.
--
-- Ce hotfix :
--   - restaure un accès x-user-hash, mais UNIQUEMENT sur les lignes encore
--     non réclamées (owner_id is null) — jamais sur une ligne déjà
--     rattachée à un compte Auth (isolation inter-utilisateurs préservée) ;
--   - ne révèle JAMAIS user_hash à anon/authenticated, sur AUCUNE des 7
--     tables (pas seulement les 4 à risque de collaboration : audit du
--     19/09/2026 — un viewer/editor pourrait sinon relire un user_hash
--     traînant sur une note de Carnet ou des réglages Hub jamais rouverts
--     depuis l'authentification). La comparaison passe systématiquement par
--     legacy_row_access(), une fonction SECURITY DEFINER qui lit user_hash
--     en interne sans jamais l'exposer au rôle appelant ;
--   - policies scindées explicitement par rôle (TO authenticated / TO anon)
--     plutôt qu'une policy PUBLIC combinée : anon n'a ainsi jamais besoin
--     d'EXECUTE sur workspace_role()/is_workspace_owner() (elles ne sont
--     référencées que dans les policies TO authenticated), préservant la
--     défense en profondeur de 20260918090000 (anon ne doit jamais pouvoir
--     invoquer ces fonctions, même sans jamais matcher).
--
-- Ce que ce hotfix NE fait PAS (conforme à l'instruction) :
--   - aucune donnée supprimée ;
--   - aucun claim automatique/massif ;
--   - aucune modification d'ownership automatique ;
--   - aucune nouvelle règle métier sur les tables V3 (non concernées ici).

-- ===========================================================================
-- 1. Fonction SECURITY DEFINER de correspondance legacy — utilisée par les 7
--    tables. Prend le ctid de la ligne (colonne système, jamais soumise aux
--    GRANT/REVOKE par colonne — indispensable ici : projets_hub_settings
--    (PK user_hash) et projets_push_subscriptions (PK endpoint) n'ont pas de
--    colonne id), lit elle-même owner_id/user_hash en interne (contourne les
--    privilèges de l'appelant, comme workspace_role()/is_workspace_owner()
--    déjà en place) — jamais besoin d'accorder SELECT sur user_hash à
--    anon/authenticated. N'accorde un accès QUE si la ligne est encore non
--    réclamée (owner_id is null).
-- ===========================================================================
create or replace function public.legacy_row_access(tbl regclass, row_ctid tid) returns boolean
  language plpgsql stable security definer set search_path = ''
  as $$
  declare
    matched boolean;
  begin
    execute format(
      'select exists (select 1 from %s where ctid = $1 and owner_id is null and user_hash = $2)',
      tbl
    ) into matched using row_ctid, (select (current_setting('request.headers', true))::json ->> 'x-user-hash');
    return coalesce(matched, false);
  end;
  $$;

revoke all on function public.legacy_row_access(regclass, tid) from public;
grant execute on function public.legacy_row_access(regclass, tid) to anon, authenticated;

-- Défensif/idempotent : anon ne doit jamais avoir EXECUTE sur ces deux
-- fonctions (20260918090000 ne l'accorde qu'à authenticated). Les policies
-- ci-dessous ne les référencent que dans leur variante TO authenticated.
revoke execute on function public.workspace_role(uuid), public.is_workspace_owner(uuid) from anon;

-- ===========================================================================
-- 2. projets_workspaces / projets_actions / projets_recurrence_rules /
--    projets_members — policies existantes (20260918090000) restreintes
--    explicitement à `authenticated` (logique inchangée), + policies
--    dédiées `anon` qui ne référencent jamais workspace_role()/
--    is_workspace_owner(), seulement legacy_row_access().
-- ===========================================================================
alter policy "workspaces_select" on public.projets_workspaces to authenticated
  using (owner_id = (select auth.uid()) or public.workspace_role(id) is not null);
alter policy "workspaces_insert" on public.projets_workspaces to authenticated
  with check (owner_id = (select auth.uid()));
alter policy "workspaces_update" on public.projets_workspaces to authenticated
  using (owner_id = (select auth.uid()) or public.workspace_role(id) = 'editor')
  with check (owner_id = (select auth.uid()) or public.workspace_role(id) = 'editor');
alter policy "workspaces_delete" on public.projets_workspaces to authenticated
  using (owner_id = (select auth.uid()));

create policy "workspaces_select_legacy" on public.projets_workspaces
  for select to anon
  using (public.legacy_row_access('public.projets_workspaces', ctid));
create policy "workspaces_insert_legacy" on public.projets_workspaces
  for insert to anon
  with check (owner_id is null);
create policy "workspaces_update_legacy" on public.projets_workspaces
  for update to anon
  using (public.legacy_row_access('public.projets_workspaces', ctid))
  with check (public.legacy_row_access('public.projets_workspaces', ctid));
create policy "workspaces_delete_legacy" on public.projets_workspaces
  for delete to anon
  using (public.legacy_row_access('public.projets_workspaces', ctid));

alter policy "actions_select" on public.projets_actions to authenticated
  using (public.workspace_role(workspace_id) is not null);
alter policy "actions_insert" on public.projets_actions to authenticated
  with check (public.workspace_role(workspace_id) in ('owner','editor'));
alter policy "actions_update" on public.projets_actions to authenticated
  using (public.workspace_role(workspace_id) is not null)
  with check (public.workspace_role(workspace_id) in ('owner','editor'));
alter policy "actions_delete" on public.projets_actions to authenticated
  using (public.workspace_role(workspace_id) is not null);

create policy "actions_select_legacy" on public.projets_actions
  for select to anon using (public.legacy_row_access('public.projets_actions', ctid));
create policy "actions_insert_legacy" on public.projets_actions
  for insert to anon with check (owner_id is null);
create policy "actions_update_legacy" on public.projets_actions
  for update to anon
  using (public.legacy_row_access('public.projets_actions', ctid))
  with check (public.legacy_row_access('public.projets_actions', ctid));
create policy "actions_delete_legacy" on public.projets_actions
  for delete to anon using (public.legacy_row_access('public.projets_actions', ctid));

alter policy "recurrence_rules_select" on public.projets_recurrence_rules to authenticated
  using (public.workspace_role(workspace_id) is not null);
alter policy "recurrence_rules_insert" on public.projets_recurrence_rules to authenticated
  with check (public.workspace_role(workspace_id) in ('owner','editor'));
alter policy "recurrence_rules_update" on public.projets_recurrence_rules to authenticated
  using (public.workspace_role(workspace_id) is not null)
  with check (public.workspace_role(workspace_id) in ('owner','editor'));
alter policy "recurrence_rules_delete" on public.projets_recurrence_rules to authenticated
  using (public.workspace_role(workspace_id) is not null);

create policy "recurrence_rules_select_legacy" on public.projets_recurrence_rules
  for select to anon using (public.legacy_row_access('public.projets_recurrence_rules', ctid));
create policy "recurrence_rules_insert_legacy" on public.projets_recurrence_rules
  for insert to anon with check (owner_id is null);
create policy "recurrence_rules_update_legacy" on public.projets_recurrence_rules
  for update to anon
  using (public.legacy_row_access('public.projets_recurrence_rules', ctid))
  with check (public.legacy_row_access('public.projets_recurrence_rules', ctid));
create policy "recurrence_rules_delete_legacy" on public.projets_recurrence_rules
  for delete to anon using (public.legacy_row_access('public.projets_recurrence_rules', ctid));

alter policy "members_select" on public.projets_members to authenticated
  using (public.workspace_role(workspace_id) is not null);
alter policy "members_insert" on public.projets_members to authenticated
  with check (public.workspace_role(workspace_id) in ('owner','editor'));
alter policy "members_update" on public.projets_members to authenticated
  using (public.workspace_role(workspace_id) is not null)
  with check (public.workspace_role(workspace_id) in ('owner','editor'));
alter policy "members_delete" on public.projets_members to authenticated
  using (public.workspace_role(workspace_id) is not null);

create policy "members_select_legacy" on public.projets_members
  for select to anon using (public.legacy_row_access('public.projets_members', ctid));
create policy "members_insert_legacy" on public.projets_members
  for insert to anon with check (owner_id is null);
create policy "members_update_legacy" on public.projets_members
  for update to anon
  using (public.legacy_row_access('public.projets_members', ctid))
  with check (public.legacy_row_access('public.projets_members', ctid));
create policy "members_delete_legacy" on public.projets_members
  for delete to anon using (public.legacy_row_access('public.projets_members', ctid));

-- ===========================================================================
-- 3. projets_carnet_notes / projets_hub_settings / projets_push_subscriptions
--    — portée strictement personnelle (jamais lues par un collaborateur),
--    mais user_hash reste une colonne comme les autres : même traitement
--    que les 4 tables ci-dessus (jamais de SELECT direct sur user_hash,
--    toujours via legacy_row_access()).
-- ===========================================================================
alter policy "carnet_notes_select" on public.projets_carnet_notes to authenticated
  using (owner_id = (select auth.uid()));
alter policy "carnet_notes_insert" on public.projets_carnet_notes to authenticated
  with check (owner_id = (select auth.uid()));
alter policy "carnet_notes_update" on public.projets_carnet_notes to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter policy "carnet_notes_delete" on public.projets_carnet_notes to authenticated
  using (owner_id = (select auth.uid()));

create policy "carnet_notes_select_legacy" on public.projets_carnet_notes
  for select to anon using (public.legacy_row_access('public.projets_carnet_notes', ctid));
create policy "carnet_notes_insert_legacy" on public.projets_carnet_notes
  for insert to anon with check (owner_id is null);
create policy "carnet_notes_update_legacy" on public.projets_carnet_notes
  for update to anon
  using (public.legacy_row_access('public.projets_carnet_notes', ctid))
  with check (public.legacy_row_access('public.projets_carnet_notes', ctid));
create policy "carnet_notes_delete_legacy" on public.projets_carnet_notes
  for delete to anon using (public.legacy_row_access('public.projets_carnet_notes', ctid));

alter policy "hub_settings_select" on public.projets_hub_settings to authenticated
  using (owner_id = (select auth.uid()));
alter policy "hub_settings_insert" on public.projets_hub_settings to authenticated
  with check (owner_id = (select auth.uid()));
alter policy "hub_settings_update" on public.projets_hub_settings to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter policy "hub_settings_delete" on public.projets_hub_settings to authenticated
  using (owner_id = (select auth.uid()));

create policy "hub_settings_select_legacy" on public.projets_hub_settings
  for select to anon using (public.legacy_row_access('public.projets_hub_settings', ctid));
create policy "hub_settings_insert_legacy" on public.projets_hub_settings
  for insert to anon with check (owner_id is null);
create policy "hub_settings_update_legacy" on public.projets_hub_settings
  for update to anon
  using (public.legacy_row_access('public.projets_hub_settings', ctid))
  with check (public.legacy_row_access('public.projets_hub_settings', ctid));
create policy "hub_settings_delete_legacy" on public.projets_hub_settings
  for delete to anon using (public.legacy_row_access('public.projets_hub_settings', ctid));

alter policy "push_subscriptions_select" on public.projets_push_subscriptions to authenticated
  using (owner_id = (select auth.uid()));
alter policy "push_subscriptions_insert" on public.projets_push_subscriptions to authenticated
  with check (owner_id = (select auth.uid()));
alter policy "push_subscriptions_update" on public.projets_push_subscriptions to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
alter policy "push_subscriptions_delete" on public.projets_push_subscriptions to authenticated
  using (owner_id = (select auth.uid()));

create policy "push_subscriptions_select_legacy" on public.projets_push_subscriptions
  for select to anon using (public.legacy_row_access('public.projets_push_subscriptions', ctid));
create policy "push_subscriptions_insert_legacy" on public.projets_push_subscriptions
  for insert to anon with check (owner_id is null);
create policy "push_subscriptions_update_legacy" on public.projets_push_subscriptions
  for update to anon
  using (public.legacy_row_access('public.projets_push_subscriptions', ctid))
  with check (public.legacy_row_access('public.projets_push_subscriptions', ctid));
create policy "push_subscriptions_delete_legacy" on public.projets_push_subscriptions
  for delete to anon using (public.legacy_row_access('public.projets_push_subscriptions', ctid));

-- ===========================================================================
-- 4. GRANT table-level pour anon sur les 7 tables (revoke all avait tout
--    supprimé) — SELECT restreint aux mêmes colonnes que authenticated
--    (jamais user_hash, sur aucune des 7 tables) ; INSERT/UPDATE/DELETE non
--    restreints par colonne (comme authenticated), la RLS ci-dessus fait le
--    travail d'isolation. anon ne reçoit AUCUN EXECUTE sur workspace_role()/
--    is_workspace_owner() : ces fonctions ne sont référencées que par des
--    policies TO authenticated, jamais évaluées pour anon.
-- ===========================================================================
grant select (id, name, description, kind, approach, collaboration_mode, preset_version, created_at, updated_at, owner_id)
  on public.projets_workspaces to anon;
grant insert, update, delete on public.projets_workspaces to anon;

grant select (id, workspace_id, title, description, status, priority, item_type, phase_id, schedule, assignee_ids, tags, source_note_id, recurrence_rule_id, waiting_since, waiting_reminder, created_at, updated_at, completed_at, notes, linked_action_id, owner_id)
  on public.projets_actions to anon;
grant insert, update, delete on public.projets_actions to anon;

grant select (id, workspace_id, frequency, interval, start_date, end_date, phase_id, title, priority, item_type, created_at, owner_id)
  on public.projets_recurrence_rules to anon;
grant insert, update, delete on public.projets_recurrence_rules to anon;

grant select (id, workspace_id, display_name, email, avatar_url, active, created_at, updated_at, owner_id)
  on public.projets_members to anon;
grant insert, update, delete on public.projets_members to anon;

revoke select on public.projets_carnet_notes from authenticated, anon;
grant select (id, text, created_at, owner_id) on public.projets_carnet_notes to authenticated, anon;
grant insert, update, delete on public.projets_carnet_notes to anon;

revoke select on public.projets_hub_settings from authenticated, anon;
grant select (monthly_objective, daily_rate, treasury_forecast, updated_at, owner_id) on public.projets_hub_settings to authenticated, anon;
grant insert, update, delete on public.projets_hub_settings to anon;

revoke select on public.projets_push_subscriptions from authenticated, anon;
grant select (endpoint, subscription, created_at, owner_id) on public.projets_push_subscriptions to authenticated, anon;
grant insert, update, delete on public.projets_push_subscriptions to anon;

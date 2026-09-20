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
--    user_hash) sur ces mêmes 7 tables. Le client fait `.select("*")`
--    (supabase-store.tsx) : Postgres refuse `SELECT *` dès qu'un rôle n'a
--    qu'un privilège colonne-par-colonne partiel → "permission denied for
--    table" pour TOUT utilisateur authentifié, sur les 4 tables encore
--    concernées (voir point 3).
--
-- Ce hotfix :
--   - restaure un accès x-user-hash, mais UNIQUEMENT sur les lignes encore
--     non réclamées (owner_id is null) — jamais sur une ligne déjà
--     rattachée à un compte Auth (isolation inter-utilisateurs préservée,
--     aucun accès élargi une fois une ligne réclamée) ;
--   - ne révèle jamais user_hash aux rôles anon/authenticated sur les 4
--     tables à risque de collaboration (projets_workspaces, projets_actions,
--     projets_recurrence_rules, projets_members — un editor/viewer d'un
--     workspace partagé pourrait sinon relire du user_hash appartenant à
--     quelqu'un d'autre, cf. audit du 19/09/2026) : la comparaison passe
--     par une fonction SECURITY DEFINER dédiée (legacy_row_access), jamais
--     par une colonne exposée au client ;
--   - restaure au contraire un GRANT SELECT complet (sans restriction de
--     colonnes) sur les 3 tables à portée strictement personnelle
--     (projets_carnet_notes, projets_hub_settings, projets_push_subscriptions
--     — jamais lues par un collaborateur, la policy owner_id/hash isole déjà
--     chaque ligne à son propriétaire) : aucune régression de sécurité
--     possible ici, et ça restaure `.select("*")` sans toucher au code
--     client pour ces 3 tables.
--
-- Ce que ce hotfix NE fait PAS (conforme à l'instruction) :
--   - aucune donnée supprimée ;
--   - aucun claim automatique/massif ;
--   - aucune modification d'ownership automatique ;
--   - aucune nouvelle règle métier sur les tables V3 (non concernées ici).

-- ===========================================================================
-- 1. Fonction SECURITY DEFINER de correspondance legacy — utilisée
--    uniquement par les 4 tables à risque de collaboration. Prend l'id de
--    la ligne (colonne déjà accordée à tous les rôles), fait elle-même la
--    lecture de owner_id/user_hash en interne (contourne les privilèges de
--    l'appelant, comme workspace_role()/is_workspace_owner() déjà en place)
--    — jamais besoin d'accorder SELECT sur user_hash à anon/authenticated.
--    N'accorde un accès QUE si la ligne est encore non réclamée
--    (owner_id is null) : une ligne déjà rattachée à un compte Auth ne
--    redevient jamais accessible par simple présentation du hash.
-- ===========================================================================
create or replace function public.legacy_row_access(tbl regclass, row_id uuid) returns boolean
  language plpgsql stable security definer set search_path = ''
  as $$
  declare
    matched boolean;
  begin
    execute format(
      'select exists (select 1 from %s where id = $1 and owner_id is null and user_hash = $2)',
      tbl
    ) into matched using row_id, (select (current_setting('request.headers', true))::json ->> 'x-user-hash');
    return coalesce(matched, false);
  end;
  $$;

revoke all on function public.legacy_row_access(regclass, uuid) from public;
grant execute on function public.legacy_row_access(regclass, uuid) to anon, authenticated;

-- anon doit pouvoir planifier une requête qui référence workspace_role() /
-- is_workspace_owner() dans une clause OR (même si, pour anon, auth.uid()
-- est toujours null et ces fonctions ne matchent jamais rien) : l'EXECUTE
-- est requis dès la planification, pas seulement à l'exécution effective.
grant execute on function public.workspace_role(uuid) to anon;
grant execute on function public.is_workspace_owner(uuid) to anon;

-- ===========================================================================
-- 2. projets_workspaces — SELECT/UPDATE/DELETE via legacy_row_access(id) ;
--    INSERT : fallback legacy limité à "aucun utilisateur authentifié ET
--    owner_id absent" (jamais besoin de lire user_hash pour un INSERT — la
--    ligne créée n'appartient qu'à celui qui la crée, aucune fuite
--    possible vers un tiers).
-- ===========================================================================
alter policy "workspaces_select" on public.projets_workspaces
  using (
    owner_id = (select auth.uid())
    or public.workspace_role(id) is not null
    or public.legacy_row_access('public.projets_workspaces', id)
  );

alter policy "workspaces_insert" on public.projets_workspaces
  with check (
    owner_id = (select auth.uid())
    or ((select auth.uid()) is null and owner_id is null)
  );

alter policy "workspaces_update" on public.projets_workspaces
  using (
    owner_id = (select auth.uid())
    or public.workspace_role(id) = 'editor'
    or public.legacy_row_access('public.projets_workspaces', id)
  )
  with check (
    owner_id = (select auth.uid())
    or public.workspace_role(id) = 'editor'
    or public.legacy_row_access('public.projets_workspaces', id)
  );

alter policy "workspaces_delete" on public.projets_workspaces
  using (
    owner_id = (select auth.uid())
    or public.legacy_row_access('public.projets_workspaces', id)
  );

-- ===========================================================================
-- 3. projets_actions / projets_recurrence_rules / projets_members — même
--    patron, gouverné par workspace_role(workspace_id) + fallback
--    legacy_row_access(id) par ligne (chaque ligne porte son propre
--    user_hash historique, indépendant du workspace parent).
-- ===========================================================================
alter policy "actions_select" on public.projets_actions
  using (public.workspace_role(workspace_id) is not null or public.legacy_row_access('public.projets_actions', id));
alter policy "actions_insert" on public.projets_actions
  with check (public.workspace_role(workspace_id) in ('owner','editor') or ((select auth.uid()) is null and owner_id is null));
alter policy "actions_update" on public.projets_actions
  using (public.workspace_role(workspace_id) is not null or public.legacy_row_access('public.projets_actions', id))
  with check (public.workspace_role(workspace_id) in ('owner','editor') or public.legacy_row_access('public.projets_actions', id));
alter policy "actions_delete" on public.projets_actions
  using (public.workspace_role(workspace_id) is not null or public.legacy_row_access('public.projets_actions', id));

alter policy "recurrence_rules_select" on public.projets_recurrence_rules
  using (public.workspace_role(workspace_id) is not null or public.legacy_row_access('public.projets_recurrence_rules', id));
alter policy "recurrence_rules_insert" on public.projets_recurrence_rules
  with check (public.workspace_role(workspace_id) in ('owner','editor') or ((select auth.uid()) is null and owner_id is null));
alter policy "recurrence_rules_update" on public.projets_recurrence_rules
  using (public.workspace_role(workspace_id) is not null or public.legacy_row_access('public.projets_recurrence_rules', id))
  with check (public.workspace_role(workspace_id) in ('owner','editor') or public.legacy_row_access('public.projets_recurrence_rules', id));
alter policy "recurrence_rules_delete" on public.projets_recurrence_rules
  using (public.workspace_role(workspace_id) is not null or public.legacy_row_access('public.projets_recurrence_rules', id));

alter policy "members_select" on public.projets_members
  using (public.workspace_role(workspace_id) is not null or public.legacy_row_access('public.projets_members', id));
alter policy "members_insert" on public.projets_members
  with check (public.workspace_role(workspace_id) in ('owner','editor') or ((select auth.uid()) is null and owner_id is null));
alter policy "members_update" on public.projets_members
  using (public.workspace_role(workspace_id) is not null or public.legacy_row_access('public.projets_members', id))
  with check (public.workspace_role(workspace_id) in ('owner','editor') or public.legacy_row_access('public.projets_members', id));
alter policy "members_delete" on public.projets_members
  using (public.workspace_role(workspace_id) is not null or public.legacy_row_access('public.projets_members', id));

-- ===========================================================================
-- 4. projets_carnet_notes / projets_hub_settings / projets_push_subscriptions
--    — portée strictement personnelle (jamais lues par un collaborateur) :
--    restauration d'un GRANT SELECT complet (user_hash inclus) + policies
--    directes owner_id/user_hash, comme avant le Lot 0. Aucune régression
--    de sécurité : la policy isole déjà chaque ligne à son propriétaire ou
--    à son hash, colonne exposée ou non.
-- ===========================================================================
grant select on public.projets_carnet_notes to authenticated, anon;
grant select on public.projets_hub_settings to authenticated, anon;
grant select on public.projets_push_subscriptions to authenticated, anon;

alter policy "carnet_notes_select" on public.projets_carnet_notes
  using (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')));
alter policy "carnet_notes_insert" on public.projets_carnet_notes
  with check (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')));
alter policy "carnet_notes_update" on public.projets_carnet_notes
  using (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')))
  with check (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')));
alter policy "carnet_notes_delete" on public.projets_carnet_notes
  using (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')));

alter policy "hub_settings_select" on public.projets_hub_settings
  using (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')));
alter policy "hub_settings_insert" on public.projets_hub_settings
  with check (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')));
alter policy "hub_settings_update" on public.projets_hub_settings
  using (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')))
  with check (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')));
alter policy "hub_settings_delete" on public.projets_hub_settings
  using (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')));

alter policy "push_subscriptions_select" on public.projets_push_subscriptions
  using (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')));
alter policy "push_subscriptions_insert" on public.projets_push_subscriptions
  with check (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')));
alter policy "push_subscriptions_update" on public.projets_push_subscriptions
  using (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')))
  with check (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')));
alter policy "push_subscriptions_delete" on public.projets_push_subscriptions
  using (owner_id = (select auth.uid()) or (owner_id is null and user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash')));

-- ===========================================================================
-- 5. GRANT table-level pour anon sur les 7 tables (revoke all avait tout
--    supprimé) — SELECT restreint aux mêmes colonnes que authenticated pour
--    les 4 tables à risque de collaboration (jamais user_hash) ; INSERT/
--    UPDATE/DELETE non restreints par colonne (comme authenticated), la RLS
--    ci-dessus fait le travail d'isolation.
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

grant insert, update, delete on public.projets_carnet_notes to anon;
grant insert, update, delete on public.projets_hub_settings to anon;
grant insert, update, delete on public.projets_push_subscriptions to anon;

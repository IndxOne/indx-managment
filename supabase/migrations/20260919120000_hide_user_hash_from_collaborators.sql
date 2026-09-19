-- Audit sécurité Lot 0 (point 6 de la review Codex, réaudité le 19/09/2026
-- avant merge de la PR #54) : user_hash reste un champ RLS row-level, pas
-- column-level — un viewer/editor d'un workspace partagé peut lire le
-- user_hash de n'importe quelle ligne de ce workspace via `select *`
-- (aucune policy ne masque des colonnes individuelles).
--
-- Ce champ n'est pas un simple horodatage legacy : c'est l'UNIQUE secret
-- encore accepté comme preuve d'autorisation par claim_legacy_user_hash()
-- (cf. 20260918090100), qui rattache à l'appelant TOUTE ligne non encore
-- réclamée (owner_id is null) portant ce même user_hash — dans
-- n'importe quelle table (workspaces, carnet_notes, hub_settings,
-- push_subscriptions), pas seulement celle où le champ a été lu.
--
-- Scénario d'exploitation concret : un utilisateur legacy (hash H) a créé
-- plusieurs workspaces sous le même appareil avant de s'authentifier.
-- Il invite un collaborateur dans le workspace A (déjà réclamé : owner_id
-- posé). Si ce même hash H traîne encore sur une note de Carnet, des
-- réglages Hub ou un autre workspace jamais rouverts depuis
-- l'authentification (owner_id toujours null), le collaborateur — simple
-- viewer ou editor de A — peut lire user_hash=H dans la réponse `select *`
-- de A, puis appeler claim_legacy_user_hash('H') lui-même et s'approprier
-- ces données personnelles du vrai propriétaire, sans jamais avoir eu
-- accès à ces objets.
--
-- Correctif minimal, sans régression : retirer uniquement le privilège
-- SELECT table-large sur `authenticated`, le regranter colonne par
-- colonne SANS user_hash. PostgREST omet alors silencieusement la colonne
-- des réponses `select *` (confirmé : aucun mapper de lecture côté
-- client — workspaceFromRow, actionFromRow, etc., src/app/adapters/
-- supabase/mappers.ts — ne consulte jamais row.user_hash ; seuls les
-- mappers d'ÉCRITURE l'envoient). claim_legacy_user_hash(), owner de
-- rls_auto_enable() et les autres fonctions SECURITY DEFINER restent
-- pleinement fonctionnelles : elles s'exécutent avec les privilèges du
-- propriétaire de la fonction, jamais soumises aux GRANT/REVOKE par
-- colonne accordés à authenticated. INSERT/UPDATE/DELETE table-larges
-- restent inchangés (seul SELECT est touché) : le client continue
-- d'écrire user_hash à la création, comme avant.
--
-- anon n'a already aucun privilège sur ces 7 tables (revoke all déjà
-- posé par 20260918090000) : rien à faire de ce côté.

revoke select on public.projets_workspaces from authenticated;
grant select (id, name, description, kind, approach, collaboration_mode, preset_version, created_at, updated_at, owner_id)
  on public.projets_workspaces to authenticated;

revoke select on public.projets_actions from authenticated;
grant select (id, workspace_id, title, description, status, priority, item_type, phase_id, schedule, assignee_ids, tags, source_note_id, recurrence_rule_id, waiting_since, waiting_reminder, created_at, updated_at, completed_at, notes, linked_action_id, owner_id)
  on public.projets_actions to authenticated;

revoke select on public.projets_recurrence_rules from authenticated;
grant select (id, workspace_id, frequency, interval, start_date, end_date, phase_id, title, priority, item_type, created_at, owner_id)
  on public.projets_recurrence_rules to authenticated;

revoke select on public.projets_carnet_notes from authenticated;
grant select (id, text, created_at, owner_id)
  on public.projets_carnet_notes to authenticated;

revoke select on public.projets_hub_settings from authenticated;
grant select (monthly_objective, daily_rate, treasury_forecast, updated_at, owner_id)
  on public.projets_hub_settings to authenticated;

revoke select on public.projets_members from authenticated;
grant select (id, workspace_id, display_name, email, avatar_url, active, created_at, updated_at, owner_id)
  on public.projets_members to authenticated;

revoke select on public.projets_push_subscriptions from authenticated;
grant select (endpoint, subscription, created_at, owner_id)
  on public.projets_push_subscriptions to authenticated;

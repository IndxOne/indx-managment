-- Les 5 policies RLS de l'app appellent current_setting('request.headers', true)
-- directement dans USING/WITH CHECK : Postgres la réévalue pour CHAQUE ligne
-- balayée au lieu d'une seule fois par requête (advisory perf Supabase
-- "auth_rls_initplan"). L'enrober dans un sous-select scalaire permet au
-- planner de la traiter comme une InitPlan, évaluée une fois. Comportement
-- fonctionnel strictement identique, uniquement un gain de performance.

alter policy "own actions" on public.projets_actions
  using (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'))
  with check (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'));

alter policy "own carnet notes" on public.projets_carnet_notes
  using (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'))
  with check (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'));

alter policy "own recurrence rules" on public.projets_recurrence_rules
  using (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'))
  with check (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'));

alter policy "own workspaces" on public.projets_workspaces
  using (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'))
  with check (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'));

alter policy "users_own_row" on public.sync_snapshots
  using (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'))
  with check (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'));

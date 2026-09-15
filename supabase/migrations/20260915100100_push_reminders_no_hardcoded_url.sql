-- Complète projets_push_reminders (20260910084347, corrigée directement :
-- l'URL de production codée en dur et le cron.schedule automatique en ont
-- été retirés) : fournit le wrapper Vault qui remplace le cron.schedule
-- original, plus un nettoyage défensif pour tout environnement qui aurait
-- appliqué l'ancienne version de 20260910084347 avant sa correction
-- (production, notamment — son historique déjà appliqué n'est jamais
-- réécrit, seul le fichier source l'est).
--
-- 1. Désarme le job cron s'il existe déjà sous ce nom (idempotent, sans
--    effet si 20260910084347 corrigée ne l'a jamais créé).
-- 2. Fournit un point d'entrée qui lit l'URL depuis Vault (par projet),
--    jamais codée en dur.
-- 3. Ne réactive PAS le cron automatiquement — activation manuelle
--    uniquement, après un test manuel réussi sur CE projet.

select cron.unschedule('projets-push-reminders')
where exists (select 1 from cron.job where jobname = 'projets-push-reminders');

create or replace function projets_push_trigger_reminders() returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  target_url text;
  cron_secret text;
  request_id bigint;
begin
  select decrypted_secret into target_url from vault.decrypted_secrets where name = 'projets_push_function_url' limit 1;
  if target_url is null then
    raise exception 'Secret Vault "projets_push_function_url" absent : définissez-le avant d''activer le cron (select projets_push_set_secret(''projets_push_function_url'', ''https://<ref-de-ce-projet>.supabase.co/functions/v1/projets-push-reminders''))';
  end if;

  select decrypted_secret into cron_secret from vault.decrypted_secrets where name = 'projets_push_cron_secret' limit 1;

  select net.http_post(
    url := target_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', cron_secret),
    body := '{}'::jsonb
  ) into request_id;

  return request_id;
end $$;
revoke all on function projets_push_trigger_reminders() from public, anon, authenticated;
grant execute on function projets_push_trigger_reminders() to service_role;

-- ===================================================================
-- ÉTAPES MANUELLES REQUISES AVANT TOUTE ACTIVATION — jamais automatiques :
--
-- 1. select projets_push_set_secret('projets_push_function_url',
--      'https://<ref-de-ce-projet>.supabase.co/functions/v1/projets-push-reminders');
--
-- 2. Déployer l'Edge Function projets-push-reminders sur CE projet.
--
-- 3. Test manuel, sans cron :
--    select projets_push_trigger_reminders();
--    select * from net._http_response order by id desc limit 1;
--
-- 4. Seulement après un test manuel concluant :
--    select cron.schedule('projets-push-reminders', '0 * * * *', $$
--      select projets_push_trigger_reminders();
--    $$);
-- ===================================================================

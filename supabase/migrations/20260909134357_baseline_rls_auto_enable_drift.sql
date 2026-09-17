-- Baseline de reconstitution : `rls_auto_enable()` et l'event trigger
-- `ensure_rls` existent réellement sur la base de production/preview
-- (wdxvhceddrtxworblfec) mais n'ont jamais été créés via une migration
-- versionnée. Confirmé en lecture seule : `supabase_migrations.schema_migrations`
-- ne contient aucune entrée de création pour ces objets, alors que la
-- migration 20260909134358_revoke_public_execute_rls_auto_enable.sql (déjà
-- versionnée, appliquée en prod) référence la fonction comme préexistante.
-- Origine : appliqués hors mécanisme de migration (SQL editor/dashboard),
-- vraisemblablement en réponse aux advisories Supabase citées dans le
-- commentaire de la fonction elle-même ("anon/authenticated_security_
-- definer_function_executable"). Définition reprise à l'identique de la
-- base réelle (pg_get_functiondef), sans réinvention.
--
-- Cette migration doit être :
--   - idempotente sur une base où ces objets existent déjà (prod) : no-op
--     fonctionnel, ne change ni la définition ni les privilèges déjà en
--     place (CREATE OR REPLACE FUNCTION est intrinsèquement idempotent ;
--     l'event trigger est créé seulement s'il n'existe pas déjà).
--   - compatible avec une base vide (reconstruction complète depuis le repo).
--   - non destructive : jamais de DROP d'un objet existant.

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$;

-- CREATE EVENT TRIGGER n'a pas de clause IF NOT EXISTS : guard explicite
-- via le catalogue pour rester non destructif sur une base où l'event
-- trigger existe déjà (prod), tout en fonctionnant sur une base vide.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_event_trigger WHERE evtname = 'ensure_rls') THEN
    CREATE EVENT TRIGGER ensure_rls ON ddl_command_end
      WHEN TAG IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      EXECUTE FUNCTION public.rls_auto_enable();
  END IF;
END
$$;

-- rls_auto_enable() est le handler d'un event trigger DDL (active RLS
-- automatiquement sur les nouvelles tables) : il n'a jamais besoin d'être
-- appelé directement, ni par anon/authenticated via PostgREST RPC, ni par
-- personne d'autre que le mécanisme d'event trigger lui-même (qui l'exécute
-- avec les droits du propriétaire, indépendamment des GRANT EXECUTE).
-- Corrige les advisories Supabase "anon/authenticated_security_definer_function_executable".
--
-- Garde conditionnelle (audit staging, 2026-09-15) : cette fonction est
-- provisionnée par le plan de contrôle de Supabase Cloud (hébergé) à la
-- création du projet — elle n'existe pas en self-hosted/local (`supabase
-- start`), confirmé par rejeu réel sur l'image officielle
-- supabase/postgres:17.6.1.167. Sans cette garde, la migration casse tout
-- rejeu local. Comportement strictement identique sur un projet Cloud où
-- la fonction existe déjà (production, staging) : la ligne s'exécute
-- normalement, rien n'est modifié pour ces environnements.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
  end if;
end $$;

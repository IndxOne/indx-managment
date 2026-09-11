-- rls_auto_enable() est le handler d'un event trigger DDL (active RLS
-- automatiquement sur les nouvelles tables) : il n'a jamais besoin d'être
-- appelé directement, ni par anon/authenticated via PostgREST RPC, ni par
-- personne d'autre que le mécanisme d'event trigger lui-même (qui l'exécute
-- avec les droits du propriétaire, indépendamment des GRANT EXECUTE).
-- Corrige les advisories Supabase "anon/authenticated_security_definer_function_executable".
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;

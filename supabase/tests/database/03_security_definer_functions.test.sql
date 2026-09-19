-- pgTAP — audit systématique des fonctions SECURITY DEFINER du domaine
-- projets_* : search_path fixe, SECURITY DEFINER effectif, EXECUTE retiré
-- de PUBLIC/anon, droits minimums (authenticated seul, sauf mention).
begin;
create extension if not exists pgtap with schema extensions;

select plan(22);

-- ===================================================================
-- is_workspace_owner(uuid)
-- ===================================================================
select is((select prosecdef from pg_proc where proname = 'is_workspace_owner' and pronamespace = 'public'::regnamespace), true, 'is_workspace_owner est SECURITY DEFINER');
select is((select proconfig from pg_proc where proname = 'is_workspace_owner' and pronamespace = 'public'::regnamespace), array['search_path=""'], 'is_workspace_owner a search_path figé à vide');
select is(has_function_privilege('anon', 'public.is_workspace_owner(uuid)', 'EXECUTE'), false, 'anon n''a pas EXECUTE sur is_workspace_owner');
select is(has_function_privilege('authenticated', 'public.is_workspace_owner(uuid)', 'EXECUTE'), true, 'authenticated a EXECUTE sur is_workspace_owner');

-- ===================================================================
-- workspace_role(uuid)
-- ===================================================================
select is((select prosecdef from pg_proc where proname = 'workspace_role' and pronamespace = 'public'::regnamespace), true, 'workspace_role est SECURITY DEFINER');
select is((select proconfig from pg_proc where proname = 'workspace_role' and pronamespace = 'public'::regnamespace), array['search_path=""'], 'workspace_role a search_path figé à vide');
select is(has_function_privilege('anon', 'public.workspace_role(uuid)', 'EXECUTE'), false, 'anon n''a pas EXECUTE sur workspace_role');
select is(has_function_privilege('authenticated', 'public.workspace_role(uuid)', 'EXECUTE'), true, 'authenticated a EXECUTE sur workspace_role');

-- ===================================================================
-- prevent_workspace_reassignment() — fonction trigger sans privilège
-- élevé et sans appel RPC direct par les rôles applicatifs.
-- ===================================================================
select is((select prosecdef from pg_proc where proname = 'prevent_workspace_reassignment' and pronamespace = 'public'::regnamespace), false, 'prevent_workspace_reassignment est SECURITY INVOKER');
select is((select proconfig from pg_proc where proname = 'prevent_workspace_reassignment' and pronamespace = 'public'::regnamespace), array['search_path=""'], 'prevent_workspace_reassignment a search_path figé à vide');
select is(has_function_privilege('anon', 'public.prevent_workspace_reassignment()', 'EXECUTE'), false, 'anon n''a pas EXECUTE sur prevent_workspace_reassignment');
select is(has_function_privilege('authenticated', 'public.prevent_workspace_reassignment()', 'EXECUTE'), false, 'authenticated n''a pas EXECUTE direct sur prevent_workspace_reassignment');

-- ===================================================================
-- prevent_workspace_owner_reassignment() — même durcissement ; protège
-- owner_id via trigger tout en laissant les opérations administratives
-- explicites au service_role/postgres.
-- ===================================================================
select is((select prosecdef from pg_proc where proname = 'prevent_workspace_owner_reassignment' and pronamespace = 'public'::regnamespace), false, 'prevent_workspace_owner_reassignment est SECURITY INVOKER');
select is((select proconfig from pg_proc where proname = 'prevent_workspace_owner_reassignment' and pronamespace = 'public'::regnamespace), array['search_path=""'], 'prevent_workspace_owner_reassignment a search_path figé à vide');
select is(has_function_privilege('anon', 'public.prevent_workspace_owner_reassignment()', 'EXECUTE'), false, 'anon n''a pas EXECUTE sur prevent_workspace_owner_reassignment');
select is(has_function_privilege('authenticated', 'public.prevent_workspace_owner_reassignment()', 'EXECUTE'), false, 'authenticated n''a pas EXECUTE direct sur prevent_workspace_owner_reassignment');

-- ===================================================================
-- claim_legacy_user_hash(text)
-- ===================================================================
select is((select prosecdef from pg_proc where proname = 'claim_legacy_user_hash' and pronamespace = 'public'::regnamespace), true, 'claim_legacy_user_hash est SECURITY DEFINER');
select is((select proconfig from pg_proc where proname = 'claim_legacy_user_hash' and pronamespace = 'public'::regnamespace), array['search_path=""'], 'claim_legacy_user_hash a search_path figé à vide');
select is(has_function_privilege('anon', 'public.claim_legacy_user_hash(text)', 'EXECUTE'), false, 'anon n''a pas EXECUTE sur claim_legacy_user_hash');
select is(has_function_privilege('authenticated', 'public.claim_legacy_user_hash(text)', 'EXECUTE'), true, 'authenticated a EXECUTE sur claim_legacy_user_hash');

-- ===================================================================
-- Contrôle auth.uid() interne : les trois fonctions appelables par
-- authenticated ne prennent jamais d'identité en paramètre (seule
-- signature acceptée = pas de paramètre "user_id"/"owner_id"/"uid" en
-- entrée), preuve statique qu'aucune ne peut être usurpée via un
-- paramètre fourni par l'appelant.
-- ===================================================================
select is(
  (select count(*) from pg_proc
   where pronamespace = 'public'::regnamespace
     and proname in ('is_workspace_owner','workspace_role','claim_legacy_user_hash')
     and pg_get_function_identity_arguments(oid) ~* '(user_id|owner_id|uid)\s+uuid')::int,
  0,
  'aucune fonction authenticated ne prend une identité utilisateur en paramètre — auth.uid() est la seule source'
);

select is(
  (select prosrc from pg_proc where proname = 'claim_legacy_user_hash' and pronamespace = 'public'::regnamespace) ~ 'auth\.uid\(\)',
  true,
  'claim_legacy_user_hash lit explicitement auth.uid() dans son corps'
);

select * from finish();
rollback;

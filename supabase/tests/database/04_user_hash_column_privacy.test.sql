-- pgTAP — audit du 19/09/2026 (point 6 review Codex) : user_hash ne doit
-- plus être lisible par authenticated sur aucune des 7 tables partagées
-- en collaboration, tout en restant accessible à postgres/service_role
-- (claim_legacy_user_hash, opérations d'administration).
begin;
create extension if not exists pgtap with schema extensions;

select plan(14);

select is(has_column_privilege('authenticated', 'public.projets_workspaces', 'user_hash', 'SELECT'), false, 'authenticated ne lit pas user_hash sur projets_workspaces');
select is(has_column_privilege('authenticated', 'public.projets_actions', 'user_hash', 'SELECT'), false, 'authenticated ne lit pas user_hash sur projets_actions');
select is(has_column_privilege('authenticated', 'public.projets_recurrence_rules', 'user_hash', 'SELECT'), false, 'authenticated ne lit pas user_hash sur projets_recurrence_rules');
select is(has_column_privilege('authenticated', 'public.projets_carnet_notes', 'user_hash', 'SELECT'), false, 'authenticated ne lit pas user_hash sur projets_carnet_notes');
select is(has_column_privilege('authenticated', 'public.projets_hub_settings', 'user_hash', 'SELECT'), false, 'authenticated ne lit pas user_hash sur projets_hub_settings');
select is(has_column_privilege('authenticated', 'public.projets_members', 'user_hash', 'SELECT'), false, 'authenticated ne lit pas user_hash sur projets_members');
select is(has_column_privilege('authenticated', 'public.projets_push_subscriptions', 'user_hash', 'SELECT'), false, 'authenticated ne lit pas user_hash sur projets_push_subscriptions');

-- Les colonnes utiles restent lisibles — pas de régression : le client
-- continue de fonctionner normalement (id/owner_id/contenu métier).
select is(has_column_privilege('authenticated', 'public.projets_workspaces', 'id', 'SELECT'), true, 'authenticated lit toujours id sur projets_workspaces');
select is(has_column_privilege('authenticated', 'public.projets_workspaces', 'owner_id', 'SELECT'), true, 'authenticated lit toujours owner_id sur projets_workspaces');
select is(has_column_privilege('authenticated', 'public.projets_actions', 'title', 'SELECT'), true, 'authenticated lit toujours title sur projets_actions');

-- anon n'avait déjà aucun accès table-large (20260918090000) : la colonne
-- ne change rien à ce périmètre, contrôle de non-régression.
select is(has_table_privilege('anon', 'public.projets_workspaces', 'SELECT'), false, 'anon n''a toujours aucun accès table-large à projets_workspaces');

-- Preuve fonctionnelle en conditions réelles : un membre authentifié qui
-- SELECT * ne récupère plus jamais user_hash dans la ligne, mais continue
-- de voir le reste (comportement PostgREST : colonne omise, pas d'erreur).
insert into auth.users (id, email) values ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'user-f@test.local');
insert into public.projets_workspaces (id, user_hash, name, kind, approach, owner_id)
  values ('33333333-4444-5555-6666-777777777777', 'legacy-hash-f', 'Workspace F', 'project', 'simple', 'ffffffff-ffff-ffff-ffff-ffffffffffff');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff', true);
select throws_ok(
  $$ select user_hash from public.projets_workspaces where id = '33333333-4444-5555-6666-777777777777' $$,
  '42501',
  null,
  'un SELECT explicite de user_hash par le propriétaire lui-même est refusé (colonne masquée pour tous, pas seulement pour autrui)'
);
select is(
  (select name from public.projets_workspaces where id = '33333333-4444-5555-6666-777777777777'),
  'Workspace F',
  'les autres colonnes restent lisibles normalement pour le propriétaire'
);

-- claim_legacy_user_hash reste fonctionnelle malgré la colonne masquée
-- pour authenticated : SECURITY DEFINER, elle lit user_hash avec les
-- privilèges du propriétaire de la fonction, jamais ceux de l'appelant.
select lives_ok(
  $$ select public.claim_legacy_user_hash('legacy-hash-f') $$,
  'claim_legacy_user_hash reste utilisable malgré le REVOKE SELECT (user_hash) sur authenticated'
);

select * from finish();
rollback;

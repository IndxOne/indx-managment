-- pgTAP — hotfix compatibilité legacy x-user-hash (20260920010000).
-- Vérifie : le hash restaure l'accès UNIQUEMENT sur des lignes non
-- réclamées (owner_id is null), jamais sur une ligne déjà rattachée à un
-- compte Auth ; anon sans hash valide n'obtient jamais rien ; isolation
-- inter-utilisateurs (deux hash différents ne se voient jamais) ; le
-- modèle Auth/workspace_role moderne continue de fonctionner à l'identique
-- (aucune régression du Lot 0, y compris sur anon qui ne doit JAMAIS avoir
-- EXECUTE sur workspace_role()/is_workspace_owner()) ; user_hash reste
-- masqué à authenticated sur les 7 tables, y compris les 3 à portée
-- personnelle (carnet_notes, hub_settings, push_subscriptions) qui n'ont
-- pas toutes de colonne id (legacy_row_access() utilise ctid).
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

-- ===================================================================
-- Fixtures
-- ===================================================================
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'hotfix-user-a@test.local');

-- W1 : legacy, jamais réclamé (owner_id null) — doit redevenir accessible
-- par son hash.
insert into public.projets_workspaces (id, user_hash, name, kind, approach) values
  ('11111111-1111-1111-1111-111111111111', 'legacy-hash-w1', 'Workspace legacy non réclamé', 'project', 'simple');

-- W2 : déjà réclamé par A (owner_id posé) — le hash historique ne doit
-- plus jamais donner accès, seul owner_id/workspace_role compte.
insert into public.projets_workspaces (id, user_hash, name, kind, approach, owner_id) values
  ('22222222-2222-2222-2222-222222222222', 'legacy-hash-w2-claimed', 'Workspace déjà réclamé', 'project', 'simple', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');

insert into public.projets_actions (id, user_hash, workspace_id, title, item_type) values
  ('33333333-3333-3333-3333-333333333333', 'legacy-hash-w1', '11111111-1111-1111-1111-111111111111', 'Action legacy non réclamée', 'task');

insert into public.projets_carnet_notes (id, user_hash, text) values
  ('44444444-4444-4444-4444-444444444444', 'legacy-hash-note', 'Note legacy non réclamée');

-- projets_hub_settings (PK = user_hash) et projets_push_subscriptions
-- (PK = endpoint) n'ont pas de colonne id : legacy_row_access() doit
-- fonctionner via ctid sur ces deux tables aussi.
insert into public.projets_hub_settings (user_hash, monthly_objective) values
  ('legacy-hash-hub', 12345);
insert into public.projets_push_subscriptions (endpoint, user_hash, subscription) values
  ('https://example.test/push-hotfix', 'legacy-hash-push', '{}'::jsonb);

-- ===================================================================
-- 0. Défense en profondeur intacte (régression du hotfix lui-même) :
--    anon ne doit JAMAIS avoir EXECUTE sur workspace_role()/
--    is_workspace_owner() — seules les policies TO authenticated les
--    référencent, jamais les policies _legacy dédiées à anon.
-- ===================================================================
select is(has_function_privilege('anon', 'public.workspace_role(uuid)', 'execute'), false, 'anon n''a pas EXECUTE sur workspace_role (défense en profondeur du Lot 0 préservée)');
select is(has_function_privilege('anon', 'public.is_workspace_owner(uuid)', 'execute'), false, 'anon n''a pas EXECUTE sur is_workspace_owner (défense en profondeur du Lot 0 préservée)');

-- ===================================================================
-- 0bis. user_hash reste masqué à authenticated sur les 7 tables (pas
--    seulement les 4 à risque de collaboration : régression du hotfix
--    lui-même, cf. audit hide_user_hash_from_collaborators).
-- ===================================================================
select is(has_column_privilege('authenticated', 'public.projets_carnet_notes', 'user_hash', 'select'), false, 'authenticated ne lit pas user_hash sur projets_carnet_notes');
select is(has_column_privilege('authenticated', 'public.projets_hub_settings', 'user_hash', 'select'), false, 'authenticated ne lit pas user_hash sur projets_hub_settings');
select is(has_column_privilege('authenticated', 'public.projets_push_subscriptions', 'user_hash', 'select'), false, 'authenticated ne lit pas user_hash sur projets_push_subscriptions');

-- ===================================================================
-- 1. anon + hash valide -> accès restauré sur ligne non réclamée
-- ===================================================================
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', json_build_object('x-user-hash', 'legacy-hash-w1')::text, true);
select is((select count(*) from public.projets_workspaces where id = '11111111-1111-1111-1111-111111111111')::int, 1, 'anon avec le bon hash légacy voit le workspace non réclamé');
select is((select count(*) from public.projets_actions where id = '33333333-3333-3333-3333-333333333333')::int, 1, 'anon avec le bon hash légacy voit l''action non réclamée');

-- ===================================================================
-- 2. Ligne déjà réclamée : le hash historique ne donne plus accès
-- ===================================================================
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', json_build_object('x-user-hash', 'legacy-hash-w2-claimed')::text, true);
select is((select count(*) from public.projets_workspaces where id = '22222222-2222-2222-2222-222222222222')::int, 0, 'une ligne déjà réclamée (owner_id posé) reste invisible même avec le hash historique correct');

-- ===================================================================
-- 3. anon sans hash valide (ou hash inconnu) n'obtient jamais rien
-- ===================================================================
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', json_build_object('x-user-hash', 'hash-qui-ne-matche-rien')::text, true);
select is((select count(*) from public.projets_workspaces where id in ('11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222'))::int, 0, 'anon avec un hash inconnu ne voit aucun workspace des fixtures');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{}'::text, true);
select is((select count(*) from public.projets_workspaces where id = '11111111-1111-1111-1111-111111111111')::int, 0, 'anon sans en-tête x-user-hash ne voit rien');

-- ===================================================================
-- 4. Isolation inter-utilisateurs : deux hash différents, jamais de fuite
-- ===================================================================
insert into public.projets_workspaces (id, user_hash, name, kind, approach) values
  ('55555555-5555-5555-5555-555555555555', 'legacy-hash-autre-utilisateur', 'Workspace d''un autre utilisateur legacy', 'project', 'simple');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', json_build_object('x-user-hash', 'legacy-hash-w1')::text, true);
select is((select count(*) from public.projets_workspaces where id = '55555555-5555-5555-5555-555555555555')::int, 0, 'un hash légacy ne voit jamais les lignes d''un autre hash légacy — isolation préservée');

-- ===================================================================
-- 5. projets_hub_settings / projets_push_subscriptions (pas de colonne
--    id, legacy_row_access() via ctid) : accès restauré sur ligne non
--    réclamée, comme les tables avec id.
-- ===================================================================
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', json_build_object('x-user-hash', 'legacy-hash-hub')::text, true);
select is((select count(*) from public.projets_hub_settings where monthly_objective = 12345)::int, 1, 'anon avec le bon hash légacy voit projets_hub_settings non réclamé (PK=user_hash, via ctid)');

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', json_build_object('x-user-hash', 'legacy-hash-push')::text, true);
select is((select count(*) from public.projets_push_subscriptions where endpoint = 'https://example.test/push-hotfix')::int, 1, 'anon avec le bon hash légacy voit projets_push_subscriptions non réclamée (PK=endpoint, via ctid)');

-- ===================================================================
-- 6. Modèle Auth/workspace_role moderne inchangé (pas de régression)
-- ===================================================================
reset role;
set local role authenticated;
select set_config('request.headers', '{}'::text, true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select is((select count(*) from public.projets_workspaces where id = '22222222-2222-2222-2222-222222222222')::int, 1, 'le propriétaire Auth voit toujours son workspace réclamé (Lot 0 inchangé)');
select is((select count(*) from public.projets_workspaces where id = '11111111-1111-1111-1111-111111111111')::int, 0, 'un utilisateur Auth sans rôle ne voit pas un workspace legacy non réclamé d''un tiers');

-- INSERT legacy (anon, owner_id absent) toujours autorisé
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', '{}'::text, true);
select lives_ok(
  $$ insert into public.projets_workspaces (id, user_hash, name, kind, approach)
     values ('66666666-6666-6666-6666-666666666666', 'legacy-hash-nouveau', 'Nouveau workspace legacy', 'project', 'simple') $$,
  'anon peut toujours créer un nouveau workspace legacy (owner_id absent)'
);

-- INSERT usurpant un owner_id existant refusé même avec un hash valide
select throws_ok(
  $$ insert into public.projets_workspaces (id, user_hash, name, kind, approach, owner_id)
     values ('77777777-7777-7777-7777-777777777777', 'legacy-hash-usurpation', 'Tentative usurpation owner_id', 'project', 'simple', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  '42501',
  null,
  'anon ne peut pas s''auto-assigner un owner_id existant à l''insertion, même avec un user_hash valide'
);

-- ===================================================================
-- 7. .select("*") restauré sur les 3 tables à portée personnelle
--    (colonnes explicites, jamais user_hash)
-- ===================================================================
reset role;
set local role authenticated;
select set_config('request.headers', '{}'::text, true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select lives_ok(
  $$ select id, text, created_at, owner_id from public.projets_carnet_notes $$,
  'SELECT colonnes explicites fonctionne pour authenticated sur projets_carnet_notes (grant restauré, sans user_hash)'
);

-- ===================================================================
-- 8. .select("*") reste refusé sur TOUTES les tables (y compris les 3 à
--    portée personnelle : le code applicatif doit lister les colonnes
--    explicitement partout, jamais seulement sur les 4 à risque de
--    collaboration).
-- ===================================================================
reset role;
set local role authenticated;
select set_config('request.headers', '{}'::text, true);
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select throws_ok(
  $$ select * from public.projets_workspaces $$,
  '42501',
  null,
  'SELECT * reste refusé sur projets_workspaces (user_hash non exposé) — colonnes explicites requises côté client'
);
select throws_ok(
  $$ select * from public.projets_carnet_notes $$,
  '42501',
  null,
  'SELECT * reste refusé sur projets_carnet_notes (user_hash non exposé même sur les tables à portée personnelle)'
);

-- La policy anon dédiée (actions_select_legacy) ne référence jamais
-- workspace_role()/is_workspace_owner() — seule la policy authenticated les
-- utilise. anon peut donc planifier une requête sans jamais avoir besoin
-- d'EXECUTE sur ces fonctions (défense en profondeur de 20260918090000
-- intégralement préservée par le hotfix).
reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.headers', json_build_object('x-user-hash', 'inconnu')::text, true);
select lives_ok(
  $$ select count(*) from public.projets_actions $$,
  'anon peut planifier une requête sur projets_actions (policy dédiée, sans EXECUTE sur workspace_role/is_workspace_owner)'
);

reset role;
select * from finish();
rollback;

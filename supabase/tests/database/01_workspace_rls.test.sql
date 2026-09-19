-- pgTAP — modèle workspace_members/roles (Lot 0, gate Auth/RLS)
-- 2 workspaces (W1 propriété de A, W2 propriété de B), 4 identités :
--   A = owner de W1, B = editor de W1 ET owner de W2, C = viewer de W1,
--   E = étranger (aucun rôle sur aucun workspace).
--
-- Note de méthode : un DELETE/UPDATE dont la clause USING de la policy RLS
-- exclut toutes les lignes cibles ne lève PAS d'exception — il affecte
-- silencieusement 0 ligne (comportement standard Postgres, identique à un
-- WHERE qui ne matche rien). Seule une violation de WITH CHECK (INSERT, ou
-- UPDATE dont la ligne est visible en USING mais dont les nouvelles valeurs
-- violent WITH CHECK) lève réellement une exception 42501. Les tests
-- "refusé" sur DELETE/UPDATE-filtré vérifient donc l'absence d'effet
-- (lives_ok + état inchangé), pas une exception.
begin;
create extension if not exists pgtap with schema extensions;

select plan(36);

-- ===================================================================
-- Fixtures
-- ===================================================================
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'user-a@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'user-b@test.local'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'user-c@test.local'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'user-e@test.local');

insert into public.projets_workspaces (id, user_hash, name, kind, approach, owner_id) values
  ('11111111-1111-1111-1111-111111111111', 'legacy-w1', 'Workspace A', 'project', 'simple', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'legacy-w2', 'Workspace B', 'project', 'simple', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

insert into public.projets_workspace_members (workspace_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'editor'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'viewer');

insert into public.projets_actions (id, user_hash, workspace_id, title, item_type, owner_id) values
  ('33333333-3333-3333-3333-333333333333', 'legacy-w1', '11111111-1111-1111-1111-111111111111', 'Action de référence W1', 'task', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('99999999-9999-9999-9999-999999999999', 'legacy-w2', '22222222-2222-2222-2222-222222222222', 'Action de référence W2', 'task', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

-- ===================================================================
-- SELECT — visibilité par rôle
-- ===================================================================
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select is((select count(*) from public.projets_actions where id = '33333333-3333-3333-3333-333333333333')::int, 1, 'owner A voit son action dans W1');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((select count(*) from public.projets_actions where id = '33333333-3333-3333-3333-333333333333')::int, 1, 'editor B (membre de W1) voit l''action de W1');

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select is((select count(*) from public.projets_actions where id = '33333333-3333-3333-3333-333333333333')::int, 1, 'viewer C voit l''action de W1');

select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', true);
select is((select count(*) from public.projets_actions where id = '33333333-3333-3333-3333-333333333333')::int, 0, 'étranger E ne voit pas l''action de W1');

-- Isolation inter-workspace : C n'a aucun rôle sur W2.
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select is((select count(*) from public.projets_actions where id = '99999999-9999-9999-9999-999999999999')::int, 0, 'viewer C (membre de W1 seulement) ne voit pas l''action de W2 — isolation inter-workspace');

-- ===================================================================
-- INSERT — owner/editor autorisés, viewer et étranger refusés
-- ===================================================================
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select lives_ok(
  $$ insert into public.projets_actions (id, user_hash, workspace_id, title, item_type)
     values ('55555555-5555-5555-5555-555555555555', 'legacy-w1', '11111111-1111-1111-1111-111111111111', 'Créée par editor B', 'task') $$,
  'editor B peut créer une action dans W1'
);

select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok(
  $$ insert into public.projets_actions (id, user_hash, workspace_id, title, item_type)
     values ('66666666-6666-6666-6666-666666666666', 'legacy-w1', '11111111-1111-1111-1111-111111111111', 'Tentative viewer C', 'task') $$,
  '42501',
  null,
  'viewer C refusé en INSERT (row-level security)'
);

select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', true);
select throws_ok(
  $$ insert into public.projets_actions (id, user_hash, workspace_id, title, item_type)
     values ('77777777-7777-7777-7777-777777777777', 'legacy-w1', '11111111-1111-1111-1111-111111111111', 'Tentative étranger E', 'task') $$,
  '42501',
  null,
  'étranger E refusé en INSERT sur un workspace dont il n''est pas membre'
);

-- ===================================================================
-- UPDATE — viewer refusé (USING l'exclut : 0 ligne, pas d'exception),
--          editor/owner autorisés
-- ===================================================================
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok(
  $ update public.projets_actions set title = 'modifié par viewer' where id = '33333333-3333-3333-3333-333333333333' $,
  '42501',
  'Rôle viewer : modification interdite',
  'viewer C reçoit un refus explicite en UPDATE'
);
select is((select title from public.projets_actions where id = '33333333-3333-3333-3333-333333333333'), 'Action de référence W1', 'le titre n''a pas changé — viewer C refusé en UPDATE (0 ligne affectée)');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select lives_ok(
  $$ update public.projets_actions set title = 'modifié par editor B' where id = '33333333-3333-3333-3333-333333333333' $$,
  'editor B peut modifier une action de W1'
);
select is((select title from public.projets_actions where id = '33333333-3333-3333-3333-333333333333'), 'modifié par editor B', 'le titre a bien changé — editor B autorisé en UPDATE');

-- ===================================================================
-- workspace_id non réaffectable, quel que soit le rôle
-- ===================================================================
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select throws_ok(
  $$ update public.projets_actions set workspace_id = '22222222-2222-2222-2222-222222222222' where id = '33333333-3333-3333-3333-333333333333' $$,
  'P0001',
  null,
  'owner A ne peut pas déplacer une action de W1 vers W2 (workspace_id immuable)'
);

-- ===================================================================
-- DELETE — viewer refusé (0 ligne, pas d'exception), editor autorisé
-- ===================================================================
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok(
  $ delete from public.projets_actions where id = '55555555-5555-5555-5555-555555555555' $,
  '42501',
  'Rôle viewer : modification interdite',
  'viewer C reçoit un refus explicite en DELETE'
);
select is((select count(*) from public.projets_actions where id = '55555555-5555-5555-5555-555555555555')::int, 1, 'la ligne existe toujours — viewer C refusé en DELETE (0 ligne affectée)');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select lives_ok(
  $$ delete from public.projets_actions where id = '55555555-5555-5555-5555-555555555555' $$,
  'editor B peut supprimer sa propre action de W1'
);
select is((select count(*) from public.projets_actions where id = '55555555-5555-5555-5555-555555555555')::int, 0, 'la ligne a bien été supprimée par editor B');

-- ===================================================================
-- Réaffectation frauduleuse d'owner_id — insertion et update
-- ===================================================================
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select throws_ok(
  $$ insert into public.projets_carnet_notes (id, user_hash, text, owner_id)
     values ('88888888-8888-8888-8888-888888888888', 'x', 'note frauduleuse', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb') $$,
  '42501',
  null,
  'A ne peut pas insérer une note avec owner_id = B (usurpation refusée)'
);

select lives_ok(
  $$ insert into public.projets_carnet_notes (id, user_hash, text, owner_id)
     values ('12121212-1212-1212-1212-121212121212', 'x', 'note légitime de A', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa') $$,
  'A peut insérer sa propre note'
);

select throws_ok(
  $$ update public.projets_carnet_notes set owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' where id = '12121212-1212-1212-1212-121212121212' $$,
  '42501',
  null,
  'A ne peut pas céder owner_id de sa note à B (réaffectation refusée)'
);

-- Un editor peut modifier le contenu d'un workspace mais jamais s'en
-- attribuer l'autorité. Ce contrôle compare OLD/NEW via le trigger dédié.
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select throws_ok(
  $$ update public.projets_workspaces
     set owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
     where id = '11111111-1111-1111-1111-111111111111' $$,
  '42501',
  'owner_id/user_hash du workspace non modifiables depuis un rôle applicatif',
  'editor B ne peut pas devenir owner de W1'
);
reset role;
select is(
  (select owner_id from public.projets_workspaces where id = '11111111-1111-1111-1111-111111111111'),
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'::uuid,
  'owner_id de W1 reste A après la tentative de B'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select throws_ok(
  $ update public.projets_actions
     set owner_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', user_hash = 'hash-editor-b'
     where id = '33333333-3333-3333-3333-333333333333' $,
  '42501',
  'owner_id/user_hash d''une action ne sont pas modifiables depuis un rôle applicatif',
  'editor B ne peut pas réattribuer les métadonnées d''ownership d''une action'
);
select throws_ok(
  $ update public.projets_workspaces
     set user_hash = 'hash-editor-b'
     where id = '11111111-1111-1111-1111-111111111111' $,
  '42501',
  'owner_id/user_hash du workspace non modifiables depuis un rôle applicatif',
  'editor B ne peut pas modifier le user_hash du workspace'
);
set local role authenticated;

-- ===================================================================
-- Rôles : impossibilité de s'auto-promouvoir
-- ===================================================================
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select is(
  (select role from public.projets_workspace_members where workspace_id = '11111111-1111-1111-1111-111111111111' and user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'viewer',
  'C est bien viewer avant tentative de promotion'
);
select lives_ok(
  $$ update public.projets_workspace_members set role = 'editor'
     where workspace_id = '11111111-1111-1111-1111-111111111111' and user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  'la tentative d''auto-promotion de C ne lève pas d''exception (USING l''exclut)'
);
select is(
  (select role from public.projets_workspace_members where workspace_id = '11111111-1111-1111-1111-111111111111' and user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'),
  'viewer',
  'C reste viewer — auto-promotion refusée (0 ligne affectée, seul l''owner peut modifier)'
);

-- Acteur = A, le vrai owner de W1 (seul autorisé par la policy INSERT) :
-- ce test isole la contrainte CHECK elle-même, pas la policy RLS déjà
-- couverte plus haut (viewer/étranger refusés en INSERT).
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select throws_ok(
  $$ insert into public.projets_workspace_members (workspace_id, user_id, role)
     values ('11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'owner') $$,
  '23514',
  null,
  '''owner'' est rejeté par la contrainte CHECK — seule projets_workspaces.owner_id fait autorité'
);

-- ===================================================================
-- workspace_members : seul l'owner ajoute, un membre peut se retirer
-- lui-même
-- ===================================================================
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok(
  $$ insert into public.projets_workspace_members (workspace_id, user_id, role)
     values ('11111111-1111-1111-1111-111111111111', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'viewer') $$,
  '42501',
  null,
  'viewer C ne peut pas ajouter un membre (réservé à l''owner)'
);

select lives_ok(
  $$ delete from public.projets_workspace_members
     where workspace_id = '11111111-1111-1111-1111-111111111111' and user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc' $$,
  'C peut se retirer lui-même du workspace'
);
select is(
  (select count(*) from public.projets_workspace_members where workspace_id = '11111111-1111-1111-1111-111111111111' and user_id = 'cccccccc-cccc-cccc-cccc-cccccccccccc')::int,
  0,
  'C n''est plus membre de W1 après son propre retrait'
);

-- ===================================================================
-- Isolation totale sur une table personnelle (hub_settings, pas de
-- workspace_id : owner_id direct)
-- ===================================================================
reset role;
insert into public.projets_hub_settings (user_hash, owner_id, monthly_objective) values ('hash-a', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 100);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select is((select count(*) from public.projets_hub_settings where user_hash = 'hash-a')::int, 0, 'B ne lit pas les réglages Hub de A');

select lives_ok(
  $$ update public.projets_hub_settings set monthly_objective = 999 where user_hash = 'hash-a' $$,
  'la tentative de modification par B ne lève pas d''exception'
);
-- vérification en bypass RLS : le SELECT de contrôle sous le rôle B
-- serait lui-même filtré (B ne voit pas la ligne de A), donnant un faux
-- positif (NULL au lieu de la vraie valeur inchangée).
reset role;
select is((select monthly_objective from public.projets_hub_settings where user_hash = 'hash-a')::int, 100, 'la valeur n''a pas changé — B refusé en UPDATE sur les réglages de A');

set local role authenticated;
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select lives_ok(
  $$ delete from public.projets_hub_settings where user_hash = 'hash-a' $$,
  'la tentative de suppression par B ne lève pas d''exception'
);
reset role;
select is((select count(*) from public.projets_hub_settings where user_hash = 'hash-a')::int, 1, 'la ligne existe toujours — B refusé en DELETE sur les réglages de A');

select * from finish();
rollback;

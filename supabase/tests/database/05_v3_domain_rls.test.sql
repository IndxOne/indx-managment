-- pgTAP — domaine V3 (Lot 1 → persistance). Même patron d'identités que
-- 01_workspace_rls.test.sql : W1 (owner A, editor B, viewer C), W2 (owner
-- B), E étranger sans rôle. Couvre les 8 cas RLS demandés (gate persistance
-- §7/§9) + la cohérence structurelle project_id/workspace_id (FK composite,
-- §2) + l'immutabilité project_id/workspace_id après création.
begin;
create extension if not exists pgtap with schema extensions;

select plan(21);

-- ===================================================================
-- Fixtures
-- ===================================================================
insert into auth.users (id, email) values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'v3-user-a@test.local'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'v3-user-b@test.local'),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'v3-user-c@test.local'),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'v3-user-e@test.local');

insert into public.projets_workspaces (id, user_hash, name, kind, approach, owner_id) values
  ('11111111-1111-1111-1111-111111111111', 'v3-legacy-w1', 'Workspace V3 A', 'project', 'simple', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
  ('22222222-2222-2222-2222-222222222222', 'v3-legacy-w2', 'Workspace V3 B', 'project', 'simple', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');

insert into public.projets_workspace_members (workspace_id, user_id, role) values
  ('11111111-1111-1111-1111-111111111111', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'editor'),
  ('11111111-1111-1111-1111-111111111111', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'viewer');

-- service_role : bypass RLS pour poser les fixtures (P1 dans W1, P2 dans W2).
set local role service_role;
insert into public.projets_v3_projects (id, workspace_id, name, method, criticality, status, created_at, updated_at) values
  ('10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Projet P1 (W1)', 'agile', 'medium', 'on_track', now(), now()),
  ('10000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Projet P2 (W2)', 'agile', 'medium', 'on_track', now(), now());

insert into public.projets_v3_work_items (id, project_id, workspace_id, type, title, status, priority, created_at, updated_at) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'task', 'Item de référence P1', 'to_scope', 'normal', now(), now());
reset role;

-- ===================================================================
-- SELECT — visibilité par rôle (cas 1, 2, 6, 7 de la section 7)
-- ===================================================================
set local role authenticated;
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select is((select count(*) from public.projets_v3_projects where id = '10000000-0000-0000-0000-000000000001')::int, 1, 'owner A lit son projet P1 (W1)');
select is((select count(*) from public.projets_v3_projects where id = '10000000-0000-0000-0000-000000000002')::int, 0, 'membre A ne lit pas le projet P2 (W2) — isolation inter-workspace');

select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', true);
select is((select count(*) from public.projets_v3_projects where id = '10000000-0000-0000-0000-000000000001')::int, 0, 'étranger E (non membre) refusé en lecture sur P1');

select set_config('request.jwt.claim.sub', null, true);
set local role anon;
select throws_ok(
  $$select count(*) from public.projets_v3_projects$$,
  '42501',
  null,
  'anon refusé (revoke all) sur projets_v3_projects'
);

-- ===================================================================
-- INSERT — viewer refusé, editor autorisé, étranger refusé (cas 3, 9)
-- ===================================================================
set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select throws_ok(
  $$insert into public.projets_v3_work_items (id, project_id, workspace_id, type, title, status, priority, created_at, updated_at)
    values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'task', 'Tentative viewer', 'to_scope', 'normal', now(), now())$$,
  '42501',
  null,
  'viewer C ne peut pas créer un WorkItem dans W1'
);

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select lives_ok(
  $$insert into public.projets_v3_work_items (id, project_id, workspace_id, type, title, status, priority, created_at, updated_at)
    values ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'task', 'Créé par editor B', 'to_scope', 'normal', now(), now())$$,
  'editor B peut créer un WorkItem dans W1 (membre editor)'
);

select set_config('request.jwt.claim.sub', 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', true);
select throws_ok(
  $$insert into public.projets_v3_work_items (id, project_id, workspace_id, type, title, status, priority, created_at, updated_at)
    values ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'task', 'Tentative étranger', 'to_scope', 'normal', now(), now())$$,
  '42501',
  null,
  'étranger E (non membre de W1) ne peut pas créer une entité dans W1'
);

-- A (owner W1 seulement) ne peut pas créer dans P2/W2 (non membre de W2).
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select throws_ok(
  $$insert into public.projets_v3_work_items (id, project_id, workspace_id, type, title, status, priority, created_at, updated_at)
    values ('20000000-0000-0000-0000-000000000005', '10000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'task', 'Tentative A dans W2', 'to_scope', 'normal', now(), now())$$,
  '42501',
  null,
  'membre A (W1 seulement) ne peut pas créer une entité dans le workspace B (W2)'
);

-- ===================================================================
-- Cohérence structurelle project_id/workspace_id — FK composite (cas 5,
-- 11). B est editor de W1 ET owner de W2 : la RLS l'autoriserait sur les
-- deux ; seule la FK composite doit bloquer le couple incohérent.
-- ===================================================================
select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select throws_ok(
  $$insert into public.projets_v3_work_items (id, project_id, workspace_id, type, title, status, priority, created_at, updated_at)
    values ('20000000-0000-0000-0000-000000000006', '10000000-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'task', 'Couple project/workspace falsifié', 'to_scope', 'normal', now(), now())$$,
  '23503',
  null,
  'FK composite (project_id, workspace_id) rejette P1 associé à W2 — falsification refusée'
);

-- ===================================================================
-- UPDATE — viewer sans effet (USING l'exclut), editor autorisé (cas 9, 10)
-- ===================================================================
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select lives_ok(
  $$update public.projets_v3_work_items set title = 'Modifié par viewer ?' where id = '20000000-0000-0000-0000-000000000001'$$,
  'UPDATE par viewer C ne lève pas d''exception (USING l''exclut, 0 ligne affectée)'
);
select is(
  (select title from public.projets_v3_work_items where id = '20000000-0000-0000-0000-000000000001'),
  'Item de référence P1',
  'viewer C n''a modifié aucune ligne (titre inchangé)'
);

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select lives_ok(
  $$update public.projets_v3_work_items set title = 'Modifié par editor B' where id = '20000000-0000-0000-0000-000000000001'$$,
  'editor B peut modifier un WorkItem de W1'
);
select is(
  (select title from public.projets_v3_work_items where id = '20000000-0000-0000-0000-000000000001'),
  'Modifié par editor B',
  'la modification par editor B est bien appliquée'
);

-- ===================================================================
-- Immutabilité workspace_id / project_id après création (décision §2).
-- ===================================================================
select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', true);
select throws_ok(
  $$update public.projets_v3_work_items set workspace_id = '22222222-2222-2222-2222-222222222222' where id = '20000000-0000-0000-0000-000000000001'$$,
  'P0001',
  null,
  'workspace_id d''un WorkItem est immuable après création'
);
select throws_ok(
  $$update public.projets_v3_work_items set project_id = '10000000-0000-0000-0000-000000000002' where id = '20000000-0000-0000-0000-000000000001'$$,
  'P0001',
  null,
  'project_id d''un WorkItem est immuable après création'
);

-- ===================================================================
-- DELETE — viewer sans effet, editor autorisé (cas 9, 10)
-- ===================================================================
set local role service_role;
insert into public.projets_v3_work_items (id, project_id, workspace_id, type, title, status, priority, created_at, updated_at) values
  ('20000000-0000-0000-0000-000000000007', '10000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'task', 'À supprimer', 'to_scope', 'normal', now(), now());
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'cccccccc-cccc-cccc-cccc-cccccccccccc', true);
select lives_ok(
  $$delete from public.projets_v3_work_items where id = '20000000-0000-0000-0000-000000000007'$$,
  'DELETE par viewer C ne lève pas d''exception (USING l''exclut)'
);
select is((select count(*) from public.projets_v3_work_items where id = '20000000-0000-0000-0000-000000000007')::int, 1, 'viewer C n''a rien supprimé — la ligne existe toujours');

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', true);
select lives_ok(
  $$delete from public.projets_v3_work_items where id = '20000000-0000-0000-0000-000000000007'$$,
  'editor B peut supprimer un WorkItem de W1'
);
select is((select count(*) from public.projets_v3_work_items where id = '20000000-0000-0000-0000-000000000007')::int, 0, 'la suppression par editor B est bien appliquée');

-- ===================================================================
-- ON DELETE RESTRICT — suppression de Project bloquée tant que des
-- entités filles existent (décision §1).
-- ===================================================================
set local role service_role;
select throws_ok(
  $$delete from public.projets_v3_projects where id = '10000000-0000-0000-0000-000000000001'$$,
  '23503',
  null,
  'suppression du Project P1 refusée tant que des WorkItem y sont rattachés (RESTRICT)'
);

-- ===================================================================
-- service_role — accès administratif conservé (cas 8), bypass RLS.
-- ===================================================================
select is((select count(*) from public.projets_v3_work_items)::int, 2, 'service_role voit toutes les lignes, tous workspaces confondus (bypass RLS)');
reset role;

select * from finish();
rollback;

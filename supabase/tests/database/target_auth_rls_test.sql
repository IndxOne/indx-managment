-- Tests pgTAP RLS COMPLETS — 7 tables × 4 opérations × rôles pertinents.
-- Exécutés uniquement contre la stack Supabase locale (supabase start),
-- jamais contre staging/production.
begin;
select plan(80);

-- ===================================================================
-- Fixtures
-- ===================================================================
insert into auth.users (id, email) values
  ('11111111-1111-1111-1111-111111111111', 'owner@exemple.com'),
  ('22222222-2222-2222-2222-222222222222', 'editor@exemple.com'),
  ('33333333-3333-3333-3333-333333333333', 'viewer@exemple.com'),
  ('44444444-4444-4444-4444-444444444444', 'stranger@exemple.com');

set role postgres;
insert into public.projets_workspaces (id, user_hash, name, kind, approach, owner_id)
values ('aaaaaaaa-0000-0000-0000-000000000001', 'legacy', 'Espace test', 'project', 'simple', '11111111-1111-1111-1111-111111111111');

insert into public.projets_workspace_members (workspace_id, user_id, role) values
  ('aaaaaaaa-0000-0000-0000-000000000001', '22222222-2222-2222-2222-222222222222', 'editor'),
  ('aaaaaaaa-0000-0000-0000-000000000001', '33333333-3333-3333-3333-333333333333', 'viewer');

insert into public.projets_actions (id, user_hash, workspace_id, title, item_type)
values ('bbbbbbbb-0000-0000-0000-000000000001', 'legacy', 'aaaaaaaa-0000-0000-0000-000000000001', 'Action test', 'task');

insert into public.projets_recurrence_rules (id, user_hash, workspace_id, frequency, start_date, title, item_type)
values ('cccccccc-0000-0000-0000-000000000001', 'legacy', 'aaaaaaaa-0000-0000-0000-000000000001', 'weekly', '2026-01-01', 'Règle test', 'task');

insert into public.projets_members (id, user_hash, workspace_id, display_name)
values ('dddddddd-0000-0000-0000-000000000001', 'legacy', 'aaaaaaaa-0000-0000-0000-000000000001', 'Assigné test');

insert into public.projets_carnet_notes (id, user_hash, text, owner_id)
values ('eeeeeeee-0000-0000-0000-000000000001', 'legacy', 'Note test', '11111111-1111-1111-1111-111111111111');

insert into public.projets_hub_settings (user_hash, owner_id, monthly_objective)
values ('legacy', '11111111-1111-1111-1111-111111111111', 1000);

insert into public.projets_push_subscriptions (endpoint, user_hash, subscription, owner_id)
values ('https://push.example/owner', 'legacy', '{}'::jsonb, '11111111-1111-1111-1111-111111111111');
reset role;

-- Helper : bascule le rôle courant pour un utilisateur donné
create or replace function test_as(p_user uuid) returns void language sql as $$
  select set_config('request.jwt.claim.sub', p_user::text, true);
$$;

-- ===================================================================
-- 1. projets_workspaces
-- ===================================================================
set role anon;
select throws_ok($$ select * from public.projets_workspaces $$, 'permission denied for table projets_workspaces', 'workspaces/SELECT/anon: refusé');
select throws_ok($$ insert into public.projets_workspaces (user_hash,name,kind,approach,owner_id) values ('x','x','project','simple','11111111-1111-1111-1111-111111111111') $$, 'permission denied for table projets_workspaces', 'workspaces/INSERT/anon: refusé');
select throws_ok($$ update public.projets_workspaces set name='x' where true $$, 'permission denied for table projets_workspaces', 'workspaces/UPDATE/anon: refusé');
select throws_ok($$ delete from public.projets_workspaces where true $$, 'permission denied for table projets_workspaces', 'workspaces/DELETE/anon: refusé');
reset role;

set role authenticated;
select test_as('11111111-1111-1111-1111-111111111111');
select isnt_empty($$ select * from public.projets_workspaces where id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'workspaces/SELECT/owner: voit');
select lives_ok($$ update public.projets_workspaces set name='Renommé par owner' where id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'workspaces/UPDATE/owner: autorisé');

select test_as('22222222-2222-2222-2222-222222222222');
select isnt_empty($$ select * from public.projets_workspaces where id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'workspaces/SELECT/editor: voit');
select lives_ok($$ update public.projets_workspaces set name='Renommé par editor' where id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'workspaces/UPDATE/editor: autorisé');
select results_eq($$ with d as (delete from public.projets_workspaces where id='aaaaaaaa-0000-0000-0000-000000000001' returning id) select count(*)::int from d $$, $$ values(0) $$, 'workspaces/DELETE/editor: refusé (0 ligne)');

select test_as('33333333-3333-3333-3333-333333333333');
select isnt_empty($$ select * from public.projets_workspaces where id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'workspaces/SELECT/viewer: voit');
select results_eq($$ with u as (update public.projets_workspaces set name='Piraté par viewer' where id='aaaaaaaa-0000-0000-0000-000000000001' returning id) select count(*)::int from u $$, $$ values(0) $$, 'workspaces/UPDATE/viewer: refusé (0 ligne)');

select test_as('44444444-4444-4444-4444-444444444444');
select is_empty($$ select * from public.projets_workspaces where id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'workspaces/SELECT/stranger: ne voit rien');
select results_eq($$ with u as (update public.projets_workspaces set name='Piraté' where id='aaaaaaaa-0000-0000-0000-000000000001' returning id) select count(*)::int from u $$, $$ values(0) $$, 'workspaces/UPDATE/stranger: refusé (0 ligne)');
select results_eq($$ with d as (delete from public.projets_workspaces where id='aaaaaaaa-0000-0000-0000-000000000001' returning id) select count(*)::int from d $$, $$ values(0) $$, 'workspaces/DELETE/stranger: refusé (0 ligne)');
select throws_ok($$ insert into public.projets_workspaces (user_hash,name,kind,approach,owner_id) values ('x','x','project','simple','11111111-1111-1111-1111-111111111111') $$, null, 'workspaces/INSERT/stranger usurpant owner_id de A: refusé (WITH CHECK)');
reset role;

-- ===================================================================
-- 2. projets_actions
-- ===================================================================
set role anon;
select throws_ok($$ select * from public.projets_actions $$, 'permission denied for table projets_actions', 'actions/SELECT/anon: refusé');
select throws_ok($$ insert into public.projets_actions (user_hash,workspace_id,title,item_type) values ('x','aaaaaaaa-0000-0000-0000-000000000001','x','task') $$, 'permission denied for table projets_actions', 'actions/INSERT/anon: refusé');
reset role;

set role authenticated;
select test_as('11111111-1111-1111-1111-111111111111');
select isnt_empty($$ select * from public.projets_actions where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'actions/SELECT/owner: voit');
select lives_ok($$ insert into public.projets_actions (user_hash,workspace_id,title,item_type) values ('x','aaaaaaaa-0000-0000-0000-000000000001','Nouvelle par owner','task') $$, 'actions/INSERT/owner: autorisé');

select test_as('22222222-2222-2222-2222-222222222222');
select lives_ok($$ insert into public.projets_actions (user_hash,workspace_id,title,item_type) values ('x','aaaaaaaa-0000-0000-0000-000000000001','Nouvelle par editor','task') $$, 'actions/INSERT/editor: autorisé');
select lives_ok($$ update public.projets_actions set title='Modifiée par editor' where id='bbbbbbbb-0000-0000-0000-000000000001' $$, 'actions/UPDATE/editor: autorisé');

select test_as('33333333-3333-3333-3333-333333333333');
select isnt_empty($$ select * from public.projets_actions where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'actions/SELECT/viewer: voit');
select throws_ok($$ insert into public.projets_actions (user_hash,workspace_id,title,item_type) values ('x','aaaaaaaa-0000-0000-0000-000000000001','Refusée','task') $$, null, 'actions/INSERT/viewer: refusé');
select results_eq($$ with u as (update public.projets_actions set title='Piratée par viewer' where id='bbbbbbbb-0000-0000-0000-000000000001' returning id) select count(*)::int from u $$, $$ values(0) $$, 'actions/UPDATE/viewer: refusé (0 ligne)');
select results_eq($$ with d as (delete from public.projets_actions where id='bbbbbbbb-0000-0000-0000-000000000001' returning id) select count(*)::int from d $$, $$ values(0) $$, 'actions/DELETE/viewer: refusé (0 ligne)');

select test_as('44444444-4444-4444-4444-444444444444');
select is_empty($$ select * from public.projets_actions where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'actions/SELECT/stranger: ne voit rien');
select throws_ok($$ insert into public.projets_actions (user_hash,workspace_id,title,item_type) values ('x','aaaaaaaa-0000-0000-0000-000000000001','Intrus','task') $$, null, 'actions/INSERT/stranger: refusé');
select results_eq($$ with u as (update public.projets_actions set title='Piratée' where id='bbbbbbbb-0000-0000-0000-000000000001' returning id) select count(*)::int from u $$, $$ values(0) $$, 'actions/UPDATE/stranger: refusé (0 ligne)');
select results_eq($$ with d as (delete from public.projets_actions where id='bbbbbbbb-0000-0000-0000-000000000001' returning id) select count(*)::int from d $$, $$ values(0) $$, 'actions/DELETE/stranger: refusé (0 ligne)');

select test_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ delete from public.projets_actions where id='bbbbbbbb-0000-0000-0000-000000000001' $$, 'actions/DELETE/owner: autorisé');
reset role;

-- ===================================================================
-- 3. projets_recurrence_rules (même patron que actions)
-- ===================================================================
set role anon;
select throws_ok($$ select * from public.projets_recurrence_rules $$, 'permission denied for table projets_recurrence_rules', 'recurrence_rules/SELECT/anon: refusé');
reset role;

set role authenticated;
select test_as('11111111-1111-1111-1111-111111111111');
select isnt_empty($$ select * from public.projets_recurrence_rules where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'recurrence_rules/SELECT/owner: voit');
select lives_ok($$ update public.projets_recurrence_rules set title='Modifiée par owner' where id='cccccccc-0000-0000-0000-000000000001' $$, 'recurrence_rules/UPDATE/owner: autorisé');

select test_as('33333333-3333-3333-3333-333333333333');
select results_eq($$ with u as (update public.projets_recurrence_rules set title='Piratée' where id='cccccccc-0000-0000-0000-000000000001' returning id) select count(*)::int from u $$, $$ values(0) $$, 'recurrence_rules/UPDATE/viewer: refusé (0 ligne)');

select test_as('44444444-4444-4444-4444-444444444444');
select is_empty($$ select * from public.projets_recurrence_rules where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'recurrence_rules/SELECT/stranger: ne voit rien');
select results_eq($$ with d as (delete from public.projets_recurrence_rules where id='cccccccc-0000-0000-0000-000000000001' returning id) select count(*)::int from d $$, $$ values(0) $$, 'recurrence_rules/DELETE/stranger: refusé (0 ligne)');

select test_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ delete from public.projets_recurrence_rules where id='cccccccc-0000-0000-0000-000000000001' $$, 'recurrence_rules/DELETE/owner: autorisé');
reset role;

-- ===================================================================
-- 4. projets_members (étiquettes d'assignation — même patron d'accès)
-- ===================================================================
set role anon;
select throws_ok($$ select * from public.projets_members $$, 'permission denied for table projets_members', 'members/SELECT/anon: refusé');
reset role;

set role authenticated;
select test_as('11111111-1111-1111-1111-111111111111');
select isnt_empty($$ select * from public.projets_members where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'members/SELECT/owner: voit');
select lives_ok($$ update public.projets_members set display_name='Modifié par owner' where id='dddddddd-0000-0000-0000-000000000001' $$, 'members/UPDATE/owner: autorisé');

select test_as('33333333-3333-3333-3333-333333333333');
select isnt_empty($$ select * from public.projets_members where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'members/SELECT/viewer: voit');
select results_eq($$ with u as (update public.projets_members set display_name='Piraté' where id='dddddddd-0000-0000-0000-000000000001' returning id) select count(*)::int from u $$, $$ values(0) $$, 'members/UPDATE/viewer: refusé (0 ligne)');

select test_as('44444444-4444-4444-4444-444444444444');
select is_empty($$ select * from public.projets_members where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'members/SELECT/stranger: ne voit rien');
select results_eq($$ with d as (delete from public.projets_members where id='dddddddd-0000-0000-0000-000000000001' returning id) select count(*)::int from d $$, $$ values(0) $$, 'members/DELETE/stranger: refusé (0 ligne)');

select test_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ delete from public.projets_members where id='dddddddd-0000-0000-0000-000000000001' $$, 'members/DELETE/owner: autorisé');
reset role;

-- ===================================================================
-- 5. projets_workspace_members (collaboration authentifiée)
-- ===================================================================
set role anon;
select throws_ok($$ select * from public.projets_workspace_members $$, 'permission denied for table projets_workspace_members', 'workspace_members/SELECT/anon: refusé');
reset role;

set role authenticated;
select test_as('33333333-3333-3333-3333-333333333333');
select isnt_empty($$ select * from public.projets_workspace_members where workspace_id='aaaaaaaa-0000-0000-0000-000000000001' $$, 'workspace_members/SELECT/viewer: voit la liste des membres');
select throws_ok($$ insert into public.projets_workspace_members (workspace_id,user_id,role) values ('aaaaaaaa-0000-0000-0000-000000000001','44444444-4444-4444-4444-444444444444','viewer') $$, null, 'workspace_members/INSERT/viewer: refusé (pas owner)');
select results_eq($$ with u as (update public.projets_workspace_members set role='editor' where user_id='33333333-3333-3333-3333-333333333333' returning id) select count(*)::int from u $$, $$ values(0) $$, 'workspace_members/UPDATE/viewer sur son propre rôle: refusé (0 ligne, seul owner change les rôles)');
select lives_ok($$ delete from public.projets_workspace_members where user_id='33333333-3333-3333-3333-333333333333' $$, 'workspace_members/DELETE/viewer se retire lui-même: autorisé');

select test_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ insert into public.projets_workspace_members (workspace_id,user_id,role) values ('aaaaaaaa-0000-0000-0000-000000000001','33333333-3333-3333-3333-333333333333','viewer') $$, 'workspace_members/INSERT/owner: autorisé (réinvitation)');
select lives_ok($$ update public.projets_workspace_members set role='editor' where user_id='33333333-3333-3333-3333-333333333333' $$, 'workspace_members/UPDATE/owner: autorisé (change un rôle)');
reset role;

-- ===================================================================
-- 6. projets_carnet_notes (portée personnelle, PAS de workspace)
-- ===================================================================
set role anon;
select throws_ok($$ select * from public.projets_carnet_notes $$, 'permission denied for table projets_carnet_notes', 'carnet_notes/SELECT/anon: refusé');
reset role;

set role authenticated;
select test_as('11111111-1111-1111-1111-111111111111');
select isnt_empty($$ select * from public.projets_carnet_notes where owner_id='11111111-1111-1111-1111-111111111111' $$, 'carnet_notes/SELECT/owner: voit sa note');
select lives_ok($$ insert into public.projets_carnet_notes (user_hash,text,owner_id) values ('x','Nouvelle note','11111111-1111-1111-1111-111111111111') $$, 'carnet_notes/INSERT/owner: autorisé');
select lives_ok($$ update public.projets_carnet_notes set text='Modifiée' where id='eeeeeeee-0000-0000-0000-000000000001' $$, 'carnet_notes/UPDATE/owner: autorisé');

select test_as('44444444-4444-4444-4444-444444444444');
select is_empty($$ select * from public.projets_carnet_notes where owner_id='11111111-1111-1111-1111-111111111111' $$, 'carnet_notes/SELECT/stranger (même "membre" du workspace de A): ne voit RIEN — carnet non partagé');
select throws_ok($$ insert into public.projets_carnet_notes (user_hash,text,owner_id) values ('x','Intruse','11111111-1111-1111-1111-111111111111') $$, null, 'carnet_notes/INSERT/stranger usurpant owner_id de A: refusé');
select results_eq($$ with u as (update public.projets_carnet_notes set text='Piratée' where id='eeeeeeee-0000-0000-0000-000000000001' returning id) select count(*)::int from u $$, $$ values(0) $$, 'carnet_notes/UPDATE/stranger: refusé (0 ligne)');
select results_eq($$ with d as (delete from public.projets_carnet_notes where id='eeeeeeee-0000-0000-0000-000000000001' returning id) select count(*)::int from d $$, $$ values(0) $$, 'carnet_notes/DELETE/stranger: refusé (0 ligne)');

select test_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ delete from public.projets_carnet_notes where id='eeeeeeee-0000-0000-0000-000000000001' $$, 'carnet_notes/DELETE/owner: autorisé');
reset role;

-- ===================================================================
-- 7. projets_hub_settings (portée personnelle, PAS de workspace)
-- ===================================================================
set role anon;
select throws_ok($$ select * from public.projets_hub_settings $$, 'permission denied for table projets_hub_settings', 'hub_settings/SELECT/anon: refusé');
reset role;

set role authenticated;
select test_as('11111111-1111-1111-1111-111111111111');
select isnt_empty($$ select * from public.projets_hub_settings where owner_id='11111111-1111-1111-1111-111111111111' $$, 'hub_settings/SELECT/owner: voit ses réglages');
select lives_ok($$ update public.projets_hub_settings set monthly_objective=2000 where owner_id='11111111-1111-1111-1111-111111111111' $$, 'hub_settings/UPDATE/owner: autorisé');

select test_as('22222222-2222-2222-2222-222222222222');
select is_empty($$ select * from public.projets_hub_settings where owner_id='11111111-1111-1111-1111-111111111111' $$, 'hub_settings/SELECT/editor du workspace de A: ne voit RIEN — réglages non partagés');
select results_eq($$ with u as (update public.projets_hub_settings set monthly_objective=1 where owner_id='11111111-1111-1111-1111-111111111111' returning owner_id) select count(*)::int from u $$, $$ values(0) $$, 'hub_settings/UPDATE/editor: refusé (0 ligne)');
select throws_ok($$ insert into public.projets_hub_settings (user_hash,owner_id,monthly_objective) values ('x','11111111-1111-1111-1111-111111111111',1) $$, null, 'hub_settings/INSERT/editor usurpant owner_id de A: refusé');

select test_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ delete from public.projets_hub_settings where owner_id='11111111-1111-1111-1111-111111111111' $$, 'hub_settings/DELETE/owner: autorisé');
reset role;

-- ===================================================================
-- 8. projets_push_subscriptions (owner_id ajouté EN COMPLÉMENT de
--    user_hash, cf. migration 20260915100000 §11) — portée personnelle,
--    anon révoqué au niveau table
-- ===================================================================
set role anon;
select throws_ok($$ select * from public.projets_push_subscriptions $$, 'permission denied for table projets_push_subscriptions', 'push_subscriptions/SELECT/anon: refusé');
select throws_ok($$ insert into public.projets_push_subscriptions (endpoint,user_hash,subscription,owner_id) values ('https://push.example/anon','x','{}'::jsonb,'11111111-1111-1111-1111-111111111111') $$, 'permission denied for table projets_push_subscriptions', 'push_subscriptions/INSERT/anon: refusé');
select throws_ok($$ update public.projets_push_subscriptions set user_hash='x' where true $$, 'permission denied for table projets_push_subscriptions', 'push_subscriptions/UPDATE/anon: refusé');
select throws_ok($$ delete from public.projets_push_subscriptions where true $$, 'permission denied for table projets_push_subscriptions', 'push_subscriptions/DELETE/anon: refusé');
reset role;

set role authenticated;
select test_as('11111111-1111-1111-1111-111111111111');
select isnt_empty($$ select * from public.projets_push_subscriptions where owner_id='11111111-1111-1111-1111-111111111111' $$, 'push_subscriptions/SELECT/owner: voit son abonnement');
select lives_ok($$ insert into public.projets_push_subscriptions (endpoint,user_hash,subscription,owner_id) values ('https://push.example/owner-2','x','{}'::jsonb,'11111111-1111-1111-1111-111111111111') $$, 'push_subscriptions/INSERT/owner: autorisé');
select lives_ok($$ update public.projets_push_subscriptions set user_hash='y' where endpoint='https://push.example/owner' $$, 'push_subscriptions/UPDATE/owner: autorisé');

select test_as('44444444-4444-4444-4444-444444444444');
select is_empty($$ select * from public.projets_push_subscriptions where owner_id='11111111-1111-1111-1111-111111111111' $$, 'push_subscriptions/SELECT/stranger: ne voit rien');
select throws_ok($$ insert into public.projets_push_subscriptions (endpoint,user_hash,subscription,owner_id) values ('https://push.example/intrus','x','{}'::jsonb,'11111111-1111-1111-1111-111111111111') $$, null, 'push_subscriptions/INSERT/stranger usurpant owner_id de A: refusé');
select results_eq($$ with u as (update public.projets_push_subscriptions set user_hash='pirate' where endpoint='https://push.example/owner' returning endpoint) select count(*)::int from u $$, $$ values(0) $$, 'push_subscriptions/UPDATE/stranger: refusé (0 ligne)');
select results_eq($$ with d as (delete from public.projets_push_subscriptions where endpoint='https://push.example/owner' returning endpoint) select count(*)::int from d $$, $$ values(0) $$, 'push_subscriptions/DELETE/stranger: refusé (0 ligne)');

select test_as('11111111-1111-1111-1111-111111111111');
select lives_ok($$ delete from public.projets_push_subscriptions where owner_id='11111111-1111-1111-1111-111111111111' $$, 'push_subscriptions/DELETE/owner: autorisé');
reset role;

select * from finish();
rollback;

-- pgTAP — claim_legacy_user_hash() : authentification, unicité de
-- réclamation par ligne, impossibilité de voler une ligne déjà réclamée,
-- idempotence, journalisation, aucun accès anonyme permanent.
begin;
create extension if not exists pgtap with schema extensions;

select plan(12);

insert into auth.users (id, email) values
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'user-d@test.local'),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'user-f@test.local');

insert into public.projets_carnet_notes (id, user_hash, text) values
  ('44444444-4444-4444-4444-444444444444', 'legacy-hash-d', 'note non réclamée');

-- ===================================================================
-- 1. Authentification obligatoire
-- ===================================================================
reset role;
select throws_ok(
  $$ select public.claim_legacy_user_hash('legacy-hash-d') $$,
  'P0001',
  'Authentification requise',
  'claim_legacy_user_hash refuse un appel sans session (auth.uid() null)'
);

-- ===================================================================
-- 2. EXECUTE retiré de public/anon
-- ===================================================================
select is(
  has_function_privilege('anon', 'public.claim_legacy_user_hash(text)', 'EXECUTE'),
  false,
  'anon n''a pas EXECUTE sur claim_legacy_user_hash'
);
select is(
  has_function_privilege('authenticated', 'public.claim_legacy_user_hash(text)', 'EXECUTE'),
  true,
  'authenticated a EXECUTE sur claim_legacy_user_hash'
);

-- ===================================================================
-- 3. Réclamation légitime : rattache la ligne, journalise
-- ===================================================================
set local role authenticated;
select set_config('request.jwt.claim.sub', 'dddddddd-dddd-dddd-dddd-dddddddddddd', true);

select is(
  (select (public.claim_legacy_user_hash('legacy-hash-d')->>'carnet_notes')::int),
  1,
  'D réclame avec succès la note associée à son ancien user_hash'
);

select is(
  (select count(*) from public.projets_carnet_notes where id = '44444444-4444-4444-4444-444444444444')::int,
  1,
  'D voit désormais sa note réclamée'
);

select is(
  (select count(*) from public.projets_legacy_hash_claims where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd' and user_hash = 'legacy-hash-d')::int,
  1,
  'la réclamation est journalisée dans projets_legacy_hash_claims'
);

-- ===================================================================
-- 4. Idempotence : rejouer avec le même hash ne provoque pas d'erreur,
--    ne re-réclame rien (déjà rattaché), mais journalise quand même l'appel
-- ===================================================================
select lives_ok(
  $$ select public.claim_legacy_user_hash('legacy-hash-d') $$,
  'un second appel avec le même hash ne lève pas d''exception (idempotent)'
);
select is(
  (select (public.claim_legacy_user_hash('legacy-hash-d')->>'carnet_notes')::int),
  0,
  'le second appel ne re-réclame aucune ligne (déjà rattachée à D)'
);
select is(
  (select count(*) from public.projets_legacy_hash_claims where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd')::int,
  3,
  'chaque appel (y compris les rejeux) est journalisé individuellement'
);

-- ===================================================================
-- 5. Impossibilité de réclamer une ligne déjà rattachée à quelqu'un
--    d'autre, même en connaissant le user_hash d'origine
-- ===================================================================
select set_config('request.jwt.claim.sub', 'ffffffff-ffff-ffff-ffff-ffffffffffff', true);
select is(
  (select (public.claim_legacy_user_hash('legacy-hash-d')->>'carnet_notes')::int),
  0,
  'F ne peut rien réclamer sur un hash déjà entièrement rattaché à D'
);
select is(
  (select count(*) from public.projets_carnet_notes where id = '44444444-4444-4444-4444-444444444444' and owner_id = 'ffffffff-ffff-ffff-ffff-ffffffffffff')::int,
  0,
  'la note reste rattachée à D, jamais à F'
);

-- ===================================================================
-- 6. Le journal n'est lisible que par son auteur (aucun accès anonyme
--    permanent, aucune lecture croisée)
-- ===================================================================
select is(
  (select count(*) from public.projets_legacy_hash_claims where user_id = 'dddddddd-dddd-dddd-dddd-dddddddddddd')::int,
  0,
  'F ne lit pas le journal de réclamation de D (RLS select own only)'
);

select * from finish();
rollback;

-- Procédure de réclamation user_hash -> auth.uid(), TEMPORAIRE (cf. cahier
-- V3 §18.1 migration non destructive, et décision de réconciliation du
-- 18/09/2026 : "ne pas maintenir indéfiniment les policies legacy" — cette
-- fonction est le seul pont restant vers les données user_hash, elle
-- n'installe aucune policy permissive.
--
-- Garanties couvertes par ce fichier (audit du 18/09/2026) :
--   - authentification obligatoire : auth.uid() vérifié, sinon exception ;
--   - réclamation unique par ligne : chaque UPDATE cible "and owner_id is
--     null", donc une ligne déjà réclamée par quelqu'un ne peut jamais
--     être reprise par un autre appelant (pas de vol de données déjà
--     rattachées) ;
--   - idempotence : rejouer la fonction avec le même hash après un premier
--     succès ne produit aucune erreur ni effet de bord — les compteurs
--     retournés retombent simplement à 0 (plus aucune ligne où
--     owner_id is null pour ce hash) ;
--   - journalisation : chaque appel (réussi ou non en nombre de lignes
--     réclamées) est tracé dans projets_legacy_hash_claims, table
--     insert-only, lisible seulement par son auteur ;
--   - aucun accès anonyme permanent : EXECUTE révoqué de public/anon,
--     accordé uniquement à authenticated ; aucune policy INSERT/UPDATE/
--     DELETE n'existe sur la table de log pour authenticated/anon (seule
--     la fonction, exécutée par le propriétaire de la migration qui
--     contourne RLS nativement, peut y écrire).
--
-- Risque résiduel assumé et documenté (hors périmètre de ce gate) :
--   target_user_hash reste un identifiant opaque transmis par le client,
--   sans preuve cryptographique de possession — un attaquant qui devine ou
--   intercepte un user_hash d'autrui peut en réclamer les données une
--   seule fois (la ligne cible), avant le légitime propriétaire. La
--   journalisation permet la détection a posteriori (user_id, hash,
--   horodatage, résultat), mais ne prévient pas l'usurpation elle-même.
--   Mitigation cryptographique (jeton de réclamation à usage unique lié à
--   la session ayant connu le hash) à traiter dans un lot ultérieur dédié
--   à l'identité, hors périmètre RLS de ce gate.

-- ===================================================================
-- 1. Journal de réclamation (insert-only, immuable pour authenticated)
-- ===================================================================
create table if not exists public.projets_legacy_hash_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  user_hash text not null,
  called_at timestamptz not null default now(),
  result jsonb not null
);

create index if not exists projets_legacy_hash_claims_user_id_idx on public.projets_legacy_hash_claims(user_id);

alter table public.projets_legacy_hash_claims enable row level security;

-- Seule policy exposée à authenticated : lire SES PROPRES entrées de
-- journal. Aucune policy INSERT/UPDATE/DELETE : la table n'est écrite que
-- par claim_legacy_user_hash() (SECURITY DEFINER, contourne RLS comme
-- propriétaire de la table), jamais directement par un rôle applicatif.
create policy "legacy_hash_claims_select_own" on public.projets_legacy_hash_claims
  for select using (user_id = (select auth.uid()));

revoke all on public.projets_legacy_hash_claims from anon;
revoke insert, update, delete on public.projets_legacy_hash_claims from authenticated;

-- ===================================================================
-- 2. Fonction de réclamation
-- ===================================================================
create or replace function public.claim_legacy_user_hash(target_user_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_uid uuid := auth.uid();
  claimed_workspaces int;
  claimed_carnet_notes int;
  claimed_hub_settings int;
  claimed_push_subscriptions int;
  claim_result jsonb;
begin
  if current_uid is null then
    raise exception 'Authentification requise';
  end if;
  if target_user_hash is null or length(btrim(target_user_hash)) = 0 then
    raise exception 'user_hash invalide';
  end if;

  update public.projets_workspaces
    set owner_id = current_uid, updated_at = now()
    where user_hash = target_user_hash and owner_id is null;
  get diagnostics claimed_workspaces = row_count;

  update public.projets_carnet_notes
    set owner_id = current_uid
    where user_hash = target_user_hash and owner_id is null;
  get diagnostics claimed_carnet_notes = row_count;

  update public.projets_hub_settings
    set owner_id = current_uid, updated_at = now()
    where user_hash = target_user_hash and owner_id is null;
  get diagnostics claimed_hub_settings = row_count;

  update public.projets_push_subscriptions
    set owner_id = current_uid
    where user_hash = target_user_hash and owner_id is null;
  get diagnostics claimed_push_subscriptions = row_count;

  claim_result := jsonb_build_object(
    'workspaces', claimed_workspaces,
    'carnet_notes', claimed_carnet_notes,
    'hub_settings', claimed_hub_settings,
    'push_subscriptions', claimed_push_subscriptions
  );

  insert into public.projets_legacy_hash_claims (user_id, user_hash, result)
  values (current_uid, target_user_hash, claim_result);

  return claim_result;
end;
$$;

revoke all on function public.claim_legacy_user_hash(text) from public, anon;
grant execute on function public.claim_legacy_user_hash(text) to authenticated;

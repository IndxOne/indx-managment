-- Correctif du 19/09/2026 (audit Lot 0, gate Auth/RLS) : cette migration
-- programmait à l'origine un cron.schedule() horaire avec l'URL de
-- production codée en dur, déclenchant un appel HTTP réel vers
-- wdxvhceddrtxworblfec.supabase.co depuis N'IMPORTE QUEL environnement
-- rejouant la chaîne de migrations (staging, local, tout futur
-- environnement reconstruit depuis zéro) — constaté lors d'une tentative
-- de reset staging. Le job cron et l'appel HTTP sont retirés d'ici ;
-- l'activation reste un geste manuel par projet (cf. pg_cron / Vault dans
-- le dashboard Supabase de l'environnement concerné), jamais automatique
-- à l'application de cette migration.
-- Non destructif : production a déjà appliqué la version d'origine de ce
-- fichier (le cron y tourne déjà, historique jamais réécrit) — ce
-- correctif ne s'applique qu'aux environnements qui n'ont PAS encore ce
-- numéro de version, donc jamais à un rejeu de la production existante.

create extension if not exists pg_cron;
create extension if not exists pg_net;

create table if not exists projets_push_subscriptions (
  endpoint text primary key,
  user_hash text not null,
  subscription jsonb not null,
  created_at timestamptz not null default now()
);
create index if not exists projets_push_subscriptions_user_hash_idx on projets_push_subscriptions (user_hash);
alter table projets_push_subscriptions enable row level security;
create policy "own push subscriptions" on projets_push_subscriptions for all
  using (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'))
  with check (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'));

create or replace function projets_push_secret(secret_name text) returns text
language sql security definer set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name limit 1;
$$;
create or replace function projets_push_set_secret(secret_name text, secret_value text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from vault.secrets where name = secret_name) then
    perform vault.update_secret((select id from vault.secrets where name = secret_name), secret_value);
  else
    perform vault.create_secret(secret_value, secret_name);
  end if;
end $$;
revoke all on function projets_push_secret(text), projets_push_set_secret(text, text) from public, anon, authenticated;
grant execute on function projets_push_secret(text), projets_push_set_secret(text, text) to service_role;

create or replace function projets_push_public_key() returns text
language sql security definer stable set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'projets_vapid_public' limit 1;
$$;
grant execute on function projets_push_public_key() to anon, authenticated;

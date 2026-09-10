-- Notifications push des relances (Web Push, RFC 8030/8291/8292).
-- Appliquée sur le projet indxone-Hub via MCP ; conservée ici comme source.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Abonnements push par appareil, isolés par x-user-hash comme les autres tables projets_*.
create table if not exists projets_push_subscriptions (
  endpoint text primary key,
  user_hash text not null,
  subscription jsonb not null, -- PushSubscription.toJSON() : { endpoint, keys: { p256dh, auth } }
  created_at timestamptz not null default now()
);
create index if not exists projets_push_subscriptions_user_hash_idx on projets_push_subscriptions (user_hash);
alter table projets_push_subscriptions enable row level security;
create policy "own push subscriptions" on projets_push_subscriptions for all
  using (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'))
  with check (user_hash = (select (current_setting('request.headers', true))::json ->> 'x-user-hash'));

-- Secrets (clés VAPID, secret cron) : Vault uniquement, jamais dans le repo ni le chat.
-- Lecture/écriture réservées au service_role (Edge Function).
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

-- Clé publique VAPID (applicationServerKey) : seule valeur exposée au client.
create or replace function projets_push_public_key() returns text
language sql security definer stable set search_path = '' as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'projets_vapid_public' limit 1;
$$;
grant execute on function projets_push_public_key() to anon, authenticated;

-- Secret partagé cron -> Edge Function (généré en base, jamais affiché).
select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'projets_push_cron_secret')
where not exists (select 1 from vault.secrets where name = 'projets_push_cron_secret');

-- URL du projet dans Vault (jamais en dur : le secret scanning Netlify la refuse dans le repo).
select vault.create_secret('https://<project-ref>.supabase.co', 'project_url')
where not exists (select 1 from vault.secrets where name = 'project_url');

-- Toutes les heures : l'Edge Function envoie les relances dues.
select cron.schedule('projets-push-reminders', '0 * * * *', $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'project_url') || '/functions/v1/projets-push-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'projets_push_cron_secret')
    ),
    body := '{}'::jsonb
  );
$$);

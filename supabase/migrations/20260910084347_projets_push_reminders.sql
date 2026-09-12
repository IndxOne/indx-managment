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

select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'), 'projets_push_cron_secret')
where not exists (select 1 from vault.secrets where name = 'projets_push_cron_secret');

select cron.schedule('projets-push-reminders', '0 * * * *', $$
  select net.http_post(
    url := 'https://wdxvhceddrtxworblfec.supabase.co/functions/v1/projets-push-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (select decrypted_secret from vault.decrypted_secrets where name = 'projets_push_cron_secret')
    ),
    body := '{}'::jsonb
  );
$$);

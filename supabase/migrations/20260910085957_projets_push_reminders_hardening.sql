drop function if exists projets_push_set_secret(text, text);

create or replace function projets_push_init_vapid(keys_json text, public_key text) returns text
language plpgsql security definer set search_path = '' as $$
declare existing text;
begin
  perform pg_advisory_xact_lock(hashtext('projets_vapid_keys'));
  select decrypted_secret into existing from vault.decrypted_secrets where name = 'projets_vapid_keys';
  if existing is not null then return existing; end if;
  perform vault.create_secret(keys_json, 'projets_vapid_keys');
  perform vault.create_secret(public_key, 'projets_vapid_public');
  return keys_json;
end $$;

create or replace function projets_push_claim_reminder(action_id uuid, since timestamptz, triggered_at timestamptz) returns boolean
language sql security definer set search_path = '' as $$
  with claimed as (
    update public.projets_actions
    set waiting_reminder = jsonb_set(waiting_reminder, '{history}', coalesce(waiting_reminder->'history', '[]'::jsonb) || to_jsonb(triggered_at))
    where id = action_id
      and status = 'waiting'
      and waiting_since = since
      and (waiting_reminder->>'enabled')::boolean
      and not exists (
        select 1 from jsonb_array_elements_text(coalesce(waiting_reminder->'history', '[]'::jsonb)) h
        where h::timestamptz >= since
      )
    returning id
  )
  select exists (select 1 from claimed);
$$;

revoke all on function projets_push_init_vapid(text, text), projets_push_claim_reminder(uuid, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function projets_push_init_vapid(text, text), projets_push_claim_reminder(uuid, timestamptz, timestamptz) to service_role;

-- Repères business déclaratifs du Hub (objectif mensuel, TJM, trésorerie
-- prévue) : une ligne par utilisateur (isolation par x-user-hash, même
-- mécanisme que les autres tables projets_*), jamais calculés.
create table if not exists public.projets_hub_settings (
  user_hash text primary key,
  monthly_objective numeric,
  daily_rate numeric,
  treasury_forecast numeric,
  updated_at timestamptz not null default now()
);

alter table public.projets_hub_settings enable row level security;

create policy "own hub settings" on public.projets_hub_settings
  for all
  using (user_hash = (current_setting('request.headers', true)::json ->> 'x-user-hash'))
  with check (user_hash = (current_setting('request.headers', true)::json ->> 'x-user-hash'));

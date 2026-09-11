create table public.projets_carnet_notes (
  id uuid primary key default gen_random_uuid(),
  user_hash text not null,
  text text not null,
  created_at timestamptz not null default now()
);

alter table public.projets_carnet_notes enable row level security;

create policy "own carnet notes" on public.projets_carnet_notes
  for all
  using (user_hash = ((current_setting('request.headers'::text, true))::json ->> 'x-user-hash'::text))
  with check (user_hash = ((current_setting('request.headers'::text, true))::json ->> 'x-user-hash'::text));

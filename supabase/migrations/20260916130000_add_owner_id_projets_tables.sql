-- Rattachement Auth (Lot rattachement, suite Lot 1A OTP) : ajoute owner_id
-- aux tables projets_* en complément de user_hash, jamais en remplacement.
--
-- owner_id est NULLABLE et n'est jamais rempli tant qu'aucune session
-- Supabase Auth active n'existe côté client (AuthScreen — Lot 1A — reste
-- isolé/non routé pour l'instant, cf. auth.ts). Une fois posé, il vaut
-- strictement auth.uid() au moment de l'écriture, jamais une valeur transmise
-- par le client — voir getCurrentAuthUserId() dans supabase/auth.ts, seul
-- point d'entrée de cette identité côté app.
--
-- Les policies "own ..." existantes (isolation par x-user-hash) restent
-- inchangées : aucune régression pour les utilisateurs actuels, tous
-- non authentifiés. Une policy additive par table autorise en plus l'accès
-- par auth.uid() = owner_id une fois qu'une ligne en dispose — les deux
-- policies PERMISSIVE d'une même table se combinent par OR (comportement
-- Postgres par défaut), donc l'ajout n'affaiblit ni ne remplace la première.

alter table public.projets_workspaces add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.projets_actions add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.projets_recurrence_rules add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.projets_carnet_notes add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.projets_hub_settings add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.projets_members add column if not exists owner_id uuid references auth.users(id) on delete set null;
alter table public.projets_push_subscriptions add column if not exists owner_id uuid references auth.users(id) on delete set null;

create index if not exists projets_workspaces_owner_id_idx on public.projets_workspaces(owner_id);
create index if not exists projets_actions_owner_id_idx on public.projets_actions(owner_id);
create index if not exists projets_recurrence_rules_owner_id_idx on public.projets_recurrence_rules(owner_id);
create index if not exists projets_carnet_notes_owner_id_idx on public.projets_carnet_notes(owner_id);
create index if not exists projets_members_owner_id_idx on public.projets_members(owner_id);
create index if not exists projets_push_subscriptions_owner_id_idx on public.projets_push_subscriptions(owner_id);

create policy "own workspaces by auth" on public.projets_workspaces
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "own actions by auth" on public.projets_actions
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "own recurrence rules by auth" on public.projets_recurrence_rules
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "own carnet notes by auth" on public.projets_carnet_notes
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "own hub settings by auth" on public.projets_hub_settings
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "own members by auth" on public.projets_members
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy "own push subscriptions by auth" on public.projets_push_subscriptions
  for all
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

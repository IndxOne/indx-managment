-- Index couvrants manquants sur 2 clés étrangères (advisory perf Supabase
-- "unindexed_foreign_keys") : évite un scan complet à chaque jointure/suppression
-- en cascade sur l'action liée ou l'espace propriétaire d'une règle de récurrence.
create index if not exists idx_projets_actions_linked_action_id
  on public.projets_actions (linked_action_id);

create index if not exists idx_projets_recurrence_rules_workspace_id
  on public.projets_recurrence_rules (workspace_id);

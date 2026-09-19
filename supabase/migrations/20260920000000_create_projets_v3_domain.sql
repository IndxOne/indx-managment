-- Lot 1 → persistance : domaine V3 (src/domain/v3) additif, isolé de V2.
-- Décisions validées par l'utilisateur (gate persistance, 20/09/2026) :
--
-- 1. ON DELETE RESTRICT entre Project et toutes ses entités filles, et
--    entre Workspace et Project V3 : aucune disparition silencieuse de
--    données de gouvernance/traçabilité par cascade. L'archivage/suppression
--    explicite fera l'objet d'une commande métier dédiée si nécessaire.
--
-- 2. Cohérence project_id/workspace_id garantie par contrainte relationnelle
--    native (pas de trigger générique) : projets_v3_projects porte
--    UNIQUE (id, workspace_id) ; chaque table fille porte
--    FOREIGN KEY (project_id, workspace_id)
--      REFERENCES projets_v3_projects (id, workspace_id) ON DELETE RESTRICT.
--    workspace_id reste une donnée d'infrastructure (RLS directe sans
--    jointure) ; le domaine ne connaît que projectId. workspace_id et
--    project_id restent immuables après création (trigger dédié, cf. plus
--    bas — réutilise le patron prevent_workspace_reassignment du Lot 0).
--
-- 3. Decision.impactedMilestoneIds est persisté via une table de jonction
--    projets_v3_decision_milestones, dont la cohérence projet/workspace est
--    garantie structurellement (FK composite vers les deux tables plutôt
--    qu'une vérification applicative seule).
--
-- 4. objectiveIds / dependencyIds / evidenceIds ne sont PAS dupliqués en
--    colonnes uuid[] : une seule source de vérité par relation (reconstruite
--    par les mappers depuis Objective.project_id / Dependency / Evidence).
--
-- 5. RLS : SELECT pour tout membre du workspace ; INSERT/UPDATE/DELETE
--    réservés à owner/editor (jamais de viewer en écriture, y compris dans
--    la clause USING d'UPDATE). anon : aucun accès.
--
-- 6. Risk → Issue : origin_risk_id en ON DELETE RESTRICT (une Issue
--    matérialisée doit conserver une provenance valide, jamais silencieuse).
--
-- 7. Stage : persisté avec son contrat domaine actuel (pas de updated_at,
--    pas de concurrence optimiste — aucune commande métier ne le mute
--    aujourd'hui). Limitation connue, documentée dans le rapport de gate,
--    non corrigée préventivement (le domaine n'est pas modifié ici).
--
-- Value Objects (§9.2 du cahier, décision Lot 1) stockés en jsonb, jamais
-- normalisés artificiellement : AcceptanceCriterion[], ImpactAssessment,
-- DecisionOption[]. Statuts en text + CHECK (pas d'ENUM Postgres, migrations
-- futures moins coûteuses). Identifiants et dates : id/created_at/updated_at
-- TOUJOURS fournis par l'appelant (§16.2 du cahier), jamais de DEFAULT côté
-- DB — le domaine V3 les injecte explicitement à chaque commande.

-- ===========================================================================
-- 1. projets_v3_projects
-- ===========================================================================
create table public.projets_v3_projects (
  id uuid primary key,
  workspace_id uuid not null references public.projets_workspaces(id) on delete restrict,
  name text not null,
  sponsor text,
  project_manager text,
  method text not null check (method in ('predictive','agile','hybrid','run')),
  criticality text not null check (criticality in ('low','medium','high','critical')),
  status text not null check (status in ('on_track','at_risk','off_track','closed')),
  target_date timestamptz,
  forecast_date timestamptz,
  current_stage_id uuid,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  last_reviewed_at timestamptz,
  unique (id, workspace_id)
);

create index projets_v3_projects_workspace_id_idx on public.projets_v3_projects(workspace_id);

-- ===========================================================================
-- 2. projets_v3_stages — Stage(projectId, name, order, status). Pas de
--    updated_at : fidèle au type domaine actuel (cf. note en tête de
--    fichier). Aucune concurrence optimiste ici.
-- ===========================================================================
create table public.projets_v3_stages (
  id uuid primary key,
  project_id uuid not null,
  workspace_id uuid not null,
  name text not null,
  "order" integer not null,
  status text not null check (status in ('not_started','active','done')),
  created_at timestamptz not null,
  unique (id, project_id, workspace_id),
  unique (project_id, "order"),
  foreign key (project_id, workspace_id)
    references public.projets_v3_projects(id, workspace_id) on delete restrict
);

create index projets_v3_stages_project_id_idx on public.projets_v3_stages(project_id);

alter table public.projets_v3_projects
  add constraint projets_v3_projects_current_stage_fk
  foreign key (current_stage_id) references public.projets_v3_stages(id) on delete set null;

-- ===========================================================================
-- 3. projets_v3_objectives
-- ===========================================================================
create table public.projets_v3_objectives (
  id uuid primary key,
  project_id uuid not null,
  workspace_id uuid not null,
  statement text not null,
  expected_value text,
  owner_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('active','achieved','abandoned')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (project_id, workspace_id)
    references public.projets_v3_projects(id, workspace_id) on delete restrict
);

create index projets_v3_objectives_project_id_idx on public.projets_v3_objectives(project_id);

-- ===========================================================================
-- 4. projets_v3_milestones
-- ===========================================================================
create table public.projets_v3_milestones (
  id uuid primary key,
  project_id uuid not null,
  workspace_id uuid not null,
  stage_id uuid references public.projets_v3_stages(id) on delete set null,
  observable_result text not null,
  target_date timestamptz not null,
  forecast_date timestamptz,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  approver_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('planned','ready_for_review','accepted','refused')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  reviewed_at timestamptz,
  unique (id, project_id, workspace_id),
  foreign key (project_id, workspace_id)
    references public.projets_v3_projects(id, workspace_id) on delete restrict
);

create index projets_v3_milestones_project_id_idx on public.projets_v3_milestones(project_id);
create index projets_v3_milestones_status_idx on public.projets_v3_milestones(status);
create index projets_v3_milestones_target_date_idx on public.projets_v3_milestones(target_date);

-- ===========================================================================
-- 5. projets_v3_work_items
-- ===========================================================================
create table public.projets_v3_work_items (
  id uuid primary key,
  project_id uuid not null,
  workspace_id uuid not null,
  type text not null check (type in ('task','request','incident','maintenance','deliverable')),
  title text not null,
  responsible_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('to_scope','ready','in_progress','blocked','validation','done','cancelled','waiting_external')),
  priority text not null check (priority in ('high','normal','low')),
  due_date timestamptz,
  exit_condition text,
  expected_result text,
  acceptance_criteria jsonb not null default '[]'::jsonb,
  milestone_id uuid references public.projets_v3_milestones(id) on delete set null,
  blocked_reason text,
  blocked_next_step text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (project_id, workspace_id)
    references public.projets_v3_projects(id, workspace_id) on delete restrict
);

create index projets_v3_work_items_project_id_idx on public.projets_v3_work_items(project_id);
create index projets_v3_work_items_status_idx on public.projets_v3_work_items(status);
create index projets_v3_work_items_due_date_idx on public.projets_v3_work_items(due_date);
create index projets_v3_work_items_responsible_id_idx on public.projets_v3_work_items(responsible_id);

-- ===========================================================================
-- 6. projets_v3_decisions
-- ===========================================================================
create table public.projets_v3_decisions (
  id uuid primary key,
  project_id uuid not null,
  workspace_id uuid not null,
  question text not null,
  context text not null,
  options jsonb not null default '[]'::jsonb,
  recommendation text,
  criteria text,
  decider_id uuid references auth.users(id) on delete set null,
  due_date timestamptz,
  status text not null check (status in ('to_prepare','ready','decided','applied','verified')),
  outcome text,
  review_conditions text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  decided_at timestamptz,
  applied_at timestamptz,
  verified_at timestamptz,
  unique (id, project_id, workspace_id),
  foreign key (project_id, workspace_id)
    references public.projets_v3_projects(id, workspace_id) on delete restrict
);

create index projets_v3_decisions_project_id_idx on public.projets_v3_decisions(project_id);
create index projets_v3_decisions_status_idx on public.projets_v3_decisions(status);
create index projets_v3_decisions_due_date_idx on public.projets_v3_decisions(due_date);

-- ===========================================================================
-- 7. projets_v3_risks
-- ===========================================================================
create table public.projets_v3_risks (
  id uuid primary key,
  project_id uuid not null,
  workspace_id uuid not null,
  event text not null,
  cause text,
  consequence text,
  probability text check (probability in ('low','medium','high')),
  impact text check (impact in ('low','medium','high')),
  criticality text check (criticality in ('low','medium','high','critical')),
  strategy text check (strategy in ('avoid','reduce','transfer','accept')),
  response text,
  owner_id uuid references auth.users(id) on delete set null,
  trigger text,
  review_date timestamptz,
  residual_risk text,
  status text not null check (status in ('identified','qualified','response_planned','under_control','closed')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (project_id, workspace_id)
    references public.projets_v3_projects(id, workspace_id) on delete restrict
);

create index projets_v3_risks_project_id_idx on public.projets_v3_risks(project_id);
create index projets_v3_risks_status_idx on public.projets_v3_risks(status);
create index projets_v3_risks_criticality_idx on public.projets_v3_risks(criticality);

-- ===========================================================================
-- 8. projets_v3_issues — origin_risk_id en RESTRICT (décision §8 : une
--    Issue matérialisée doit conserver une provenance valide).
--    blocked_entity_id : référence libre non-FK, comme le domaine le
--    documente (pas de type polymorphe strict côté TypeScript).
-- ===========================================================================
create table public.projets_v3_issues (
  id uuid primary key,
  project_id uuid not null,
  workspace_id uuid not null,
  origin_risk_id uuid references public.projets_v3_risks(id) on delete restrict,
  problem text not null,
  actual_impact text,
  blocked_entity_id uuid,
  resolver_id uuid references auth.users(id) on delete set null,
  corrective_action text,
  target_date timestamptz,
  escalated boolean not null default false,
  status text not null check (status in ('open','in_progress','resolved','escalated')),
  created_at timestamptz not null,
  updated_at timestamptz not null,
  resolved_at timestamptz,
  foreign key (project_id, workspace_id)
    references public.projets_v3_projects(id, workspace_id) on delete restrict
);

create index projets_v3_issues_project_id_idx on public.projets_v3_issues(project_id);
create index projets_v3_issues_status_idx on public.projets_v3_issues(status);
create index projets_v3_issues_origin_risk_id_idx on public.projets_v3_issues(origin_risk_id);

-- ===========================================================================
-- 9. projets_v3_dependencies — source/dependent entity id : références
--    libres non-FK (relient des entités hétérogènes, comme documenté dans
--    le domaine). responsible_id : invariant de création NOT NULL
--    (DEP-001), donc RESTRICT plutôt que SET NULL (qui échouerait de toute
--    façon contre la contrainte NOT NULL — RESTRICT rend l'échec explicite).
-- ===========================================================================
create table public.projets_v3_dependencies (
  id uuid primary key,
  project_id uuid not null,
  workspace_id uuid not null,
  source_entity_id uuid not null,
  dependent_entity_id uuid not null,
  type text not null check (type in ('blocks','requires','relates_to')),
  responsible_id uuid not null references auth.users(id) on delete restrict,
  needed_by_date timestamptz,
  status text not null check (status in ('pending','confirmed','delayed','resolved')),
  delay_impact text,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (project_id, workspace_id)
    references public.projets_v3_projects(id, workspace_id) on delete restrict
);

create index projets_v3_dependencies_project_id_idx on public.projets_v3_dependencies(project_id);
create index projets_v3_dependencies_status_idx on public.projets_v3_dependencies(status);
create index projets_v3_dependencies_source_entity_id_idx on public.projets_v3_dependencies(source_entity_id);
create index projets_v3_dependencies_dependent_entity_id_idx on public.projets_v3_dependencies(dependent_entity_id);

-- ===========================================================================
-- 10. projets_v3_change_requests
-- ===========================================================================
create table public.projets_v3_change_requests (
  id uuid primary key,
  project_id uuid not null,
  workspace_id uuid not null,
  request text not null,
  origin text not null,
  justification text,
  impact jsonb not null default '{}'::jsonb,
  options jsonb not null default '[]'::jsonb,
  recommendation text,
  decider_id uuid references auth.users(id) on delete set null,
  status text not null check (status in ('submitted','under_analysis','decided','applied','rejected')),
  linked_decision_id uuid references public.projets_v3_decisions(id) on delete set null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (project_id, workspace_id)
    references public.projets_v3_projects(id, workspace_id) on delete restrict
);

create index projets_v3_change_requests_project_id_idx on public.projets_v3_change_requests(project_id);
create index projets_v3_change_requests_status_idx on public.projets_v3_change_requests(status);

-- ===========================================================================
-- 11. projets_v3_evidence — pas de updated_at dans le domaine (seul
--     validationStatus mute, sans horodatage dédié) : pas de concurrence
--     optimiste ici, même limitation assumée que Stage.
-- ===========================================================================
create table public.projets_v3_evidence (
  id uuid primary key,
  project_id uuid not null,
  workspace_id uuid not null,
  proved_entity_type text not null check (proved_entity_type in ('work_item','decision','milestone','change_request')),
  proved_entity_id uuid not null,
  type text not null check (type in ('document','link','screenshot','approval','other')),
  description text not null,
  source text,
  author_id uuid references auth.users(id) on delete set null,
  validation_status text not null check (validation_status in ('pending','validated','rejected')),
  created_at timestamptz not null,
  foreign key (project_id, workspace_id)
    references public.projets_v3_projects(id, workspace_id) on delete restrict
);

create index projets_v3_evidence_project_id_idx on public.projets_v3_evidence(project_id);
create index projets_v3_evidence_proved_entity_idx on public.projets_v3_evidence(proved_entity_type, proved_entity_id);

-- ===========================================================================
-- 12. projets_v3_decision_milestones — Decision.impactedMilestoneIds.
--     Cohérence projet/workspace garantie STRUCTURELLEMENT : les deux FK
--     composites pointent vers la même paire (project_id, workspace_id)
--     portée par cette table de jonction, donc une Decision et un Milestone
--     de projets différents ne peuvent physiquement pas être liés.
--     ON DELETE CASCADE : la ligne de jonction n'a pas de sens propre hors
--     de ses deux extrémités (ce n'est pas une entité de gouvernance en
--     elle-même, contrairement aux 11 tables ci-dessus).
-- ===========================================================================
create table public.projets_v3_decision_milestones (
  decision_id uuid not null,
  milestone_id uuid not null,
  project_id uuid not null,
  workspace_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (decision_id, milestone_id),
  foreign key (decision_id, project_id, workspace_id)
    references public.projets_v3_decisions(id, project_id, workspace_id) on delete cascade,
  foreign key (milestone_id, project_id, workspace_id)
    references public.projets_v3_milestones(id, project_id, workspace_id) on delete cascade
);

create index projets_v3_decision_milestones_workspace_id_idx on public.projets_v3_decision_milestones(workspace_id);

-- ===========================================================================
-- 13. Immutabilité project_id / workspace_id après création (décision §2 :
--     contrainte FK composite pour la cohérence croisée, trigger dédié
--     seulement pour empêcher une réaffectation après coup — FK seule ne
--     compare pas OLD/NEW). Réutilise le patron prevent_workspace_reassignment
--     du Lot 0 (fonction déjà existante, générique sur NEW/OLD.workspace_id) ;
--     ajoute son équivalent pour project_id.
-- ===========================================================================
create or replace function public.prevent_v3_project_reassignment() returns trigger
  language plpgsql security invoker set search_path = ''
  as $$
  begin
    if new.project_id is distinct from old.project_id then
      raise exception 'project_id non modifiable après création (ligne %, ancien %, nouveau %)',
        old.id, old.project_id, new.project_id;
    end if;
    return new;
  end;
  $$;

revoke all on function public.prevent_v3_project_reassignment() from public, anon, authenticated;
grant execute on function public.prevent_v3_project_reassignment() to service_role;

do $$
declare
  t text;
begin
  foreach t in array array[
    'projets_v3_objectives', 'projets_v3_stages', 'projets_v3_work_items',
    'projets_v3_decisions', 'projets_v3_risks', 'projets_v3_issues',
    'projets_v3_milestones', 'projets_v3_dependencies',
    'projets_v3_change_requests', 'projets_v3_evidence'
  ]
  loop
    execute format(
      'create trigger prevent_workspace_reassignment before update on public.%I for each row execute function public.prevent_workspace_reassignment()',
      t
    );
    execute format(
      'create trigger prevent_project_reassignment before update on public.%I for each row execute function public.prevent_v3_project_reassignment()',
      t
    );
  end loop;
end $$;

-- projets_v3_projects lui-même : workspace_id immuable (même fonction,
-- déjà générique — regarde uniquement NEW/OLD.workspace_id).
create trigger prevent_workspace_reassignment before update on public.projets_v3_projects
  for each row execute function public.prevent_workspace_reassignment();

-- ===========================================================================
-- 14. RLS — réutilise workspace_role() du Lot 0. Patron uniforme (décision
--     §9) : SELECT membre, INSERT/UPDATE/DELETE réservés owner/editor,
--     jamais de viewer en USING d'UPDATE, anon révoqué.
-- ===========================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'projets_v3_projects', 'projets_v3_objectives', 'projets_v3_stages',
    'projets_v3_milestones', 'projets_v3_work_items', 'projets_v3_decisions',
    'projets_v3_risks', 'projets_v3_issues', 'projets_v3_dependencies',
    'projets_v3_change_requests', 'projets_v3_evidence'
  ]
  loop
    execute format('alter table public.%I enable row level security', t);

    execute format(
      $f$create policy "%1$s_select" on public.%1$I for select using (public.workspace_role(workspace_id) is not null)$f$,
      t
    );
    execute format(
      $f$create policy "%1$s_insert" on public.%1$I for insert with check (public.workspace_role(workspace_id) in ('owner','editor'))$f$,
      t
    );
    execute format(
      $f$create policy "%1$s_update" on public.%1$I for update using (public.workspace_role(workspace_id) in ('owner','editor')) with check (public.workspace_role(workspace_id) in ('owner','editor'))$f$,
      t
    );
    execute format(
      $f$create policy "%1$s_delete" on public.%1$I for delete using (public.workspace_role(workspace_id) in ('owner','editor'))$f$,
      t
    );

    execute format('revoke all on public.%I from anon', t);
  end loop;
end $$;

-- projets_v3_decision_milestones : même patron (pas d'UPDATE — clé
-- primaire composite, pas de champ mutable ; INSERT/DELETE owner/editor).
alter table public.projets_v3_decision_milestones enable row level security;

create policy "decision_milestones_select" on public.projets_v3_decision_milestones
  for select using (public.workspace_role(workspace_id) is not null);
create policy "decision_milestones_insert" on public.projets_v3_decision_milestones
  for insert with check (public.workspace_role(workspace_id) in ('owner','editor'));
create policy "decision_milestones_delete" on public.projets_v3_decision_milestones
  for delete using (public.workspace_role(workspace_id) in ('owner','editor'));

revoke all on public.projets_v3_decision_milestones from anon;

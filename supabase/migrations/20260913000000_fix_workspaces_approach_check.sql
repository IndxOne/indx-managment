-- Corrige une dérive schéma/code : ProfessionalApproach (src/domain/types.ts)
-- et PRESET_REGISTRY (src/presets/preset-registry.ts) incluent "client_web"
-- depuis le renouveau produit, mais la contrainte CHECK posée à la création
-- de la table (20260908101148_create_projets_tables.sql) ne l'avait jamais
-- reçue — tout INSERT/UPDATE d'un workspace "client_web" échoue en
-- production (violation "projets_workspaces_approach_check").
--
-- Remplace la contrainte par son équivalent exact aux 6 valeurs
-- actuellement valides côté application, sans jamais la supprimer : c'est
-- une protection d'intégrité, pas une formalité. Aucune donnée existante
-- n'est modifiée (DDL pur) ; toutes les valeurs actuelles ("it_ops",
-- "management", "product_tech", "project_amoa") restent dans le nouvel
-- ensemble autorisé, donc aucune ligne existante n'est affectée.
alter table public.projets_workspaces
  drop constraint projets_workspaces_approach_check;

alter table public.projets_workspaces
  add constraint projets_workspaces_approach_check
  check (approach = any (array[
    'simple'::text,
    'it_ops'::text,
    'project_amoa'::text,
    'product_tech'::text,
    'management'::text,
    'client_web'::text
  ]));

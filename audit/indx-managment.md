# Audit — indx-managment
Statut : actif — dernier commit : 2026-09-22

## Points forts
- CI complète sur chaque PR/push main : typecheck, lint, tests (vitest), build, + reset/tests Supabase DB.
- Suite de tests importante (257 tests / 45 fichiers selon `docs/AUDIT.md` interne, daté 11 sept. 2026), architecture domaine/UI/persistance bien séparée.
- Aucun secret détecté en clair (recherche AKIA / SECRET_KEY / BEGIN PRIVATE KEY : 0 résultat) ; `.env.example` documente les variables sans valeurs réelles.

## Risques
- Pas de README à la racine du repo — onboarding dépend entièrement de `docs/AUDIT.md` et `docs/dev-handoff-codex.md`.
- Schéma Supabase incomplet dans le repo : tables coeur (`projets_workspaces`, `projets_actions`, `projets_carnet_notes`, `projets_recurrence_rules`) sans migration versionnée — dérive schéma/code non détectable, reconstruction impossible depuis le repo seul.
- Dette technique concentrée : `SupabaseStoreProvider` (666 lignes, toutes les mutations), `global.css` (1967 lignes, non scopé), duplication `ActionCard`/`KanbanCard`, pas de Prettier en CI. Champs `collaborationMode`/`assigneeIds` modélisés mais jamais exposés en UI (dette produit silencieuse).

## Effort estimé de remédiation
- README + migrations Supabase manquantes : faible (quelques heures).
- Refactors (SupabaseStoreProvider, CSS, duplication cartes) : moyen (plusieurs jours, découpable en étapes indépendantes déjà planifiées dans `docs/AUDIT.md`).

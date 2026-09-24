# Synthèse audit — indxone/indx-notepad, indx-hub, indx-managment

Date : 2026-09-24. 3 repos scannés, tous actifs (dernier commit < 8 jours). Aucun repo à archiver.

## Priorité 1 — Gains rapides (< 1 jour chacun)

**1. indx-hub : aucune CI sur le miroir GitHub**
Constat → seul `.gitlab-ci.yml` existe, aucun `.github/workflows`. Le repo GitHub n'a aucune vérification automatique (tests/lint/build) sur push/PR.
Action → dupliquer le pipeline GitLab (test, lint, typecheck, build) en GitHub Actions.
Effort → 0,5-1j.
Gain → sécurise le repo réellement utilisé (GitHub) contre les régressions silencieuses.

**2. indx-managment : migrations Supabase absentes du repo**
Constat → les 4 tables coeur n'ont aucune migration versionnée dans le repo.
Action → générer et committer les migrations (`supabase db diff`), point de non-retour si l'accès au projet Supabase est perdu.
Effort → quelques heures.
Gain → élimine un risque de perte de schéma irréversible.

**3. indx-managment : pas de README racine**
Constat → onboarding repose sur `docs/AUDIT.md`, pas de point d'entrée standard.
Action → README avec stack, setup local, lien vers `docs/AUDIT.md`.
Effort → quelques heures.
Gain → onboarding plus rapide (nouveau contributeur ou reprise après pause).

**4. indx-notepad : CI dupliquée/morte**
Constat → `.github/workflows/ci.yml` (actif) coexiste avec un `.gitlab-ci.yml` visiblement inutilisé.
Action → supprimer le `.gitlab-ci.yml` mort.
Effort → < 1h.
Gain → pipeline unique, moins de confusion à la maintenance.

**5. indx-hub : TODO obsolètes dans `netlify.toml`**
Constat → 2 TODO (protection `shared/owner.js`, CSP) alors que le CSP semble déjà implémenté.
Action → vérifier et nettoyer.
Effort → < 1h.
Gain → documentation fiable, pas de fausse alerte pour le prochain audit.

## Priorité 2 — Dette structurelle (plusieurs jours)

**6. indx-hub : duplication logique métier (legacy vs moderne)**
Constat → calculs TJM/mission dupliqués entre `shared/*.js` (legacy statique) et `src/` (React/Vite moderne) → risque de divergence silencieuse des calculs.
Action → extraire la logique de calcul dans un module unique partagé par les deux fronts, ou migrer complètement le legacy.
Effort → plusieurs jours.
Gain → élimine un risque métier direct (mauvais TJM affiché = crédibilité commerciale IndxOne).

**7. indx-managment : dette technique déjà cartographiée**
Constat → `SupabaseStoreProvider` (666 lignes), `global.css` non scopé (1967 lignes), duplication `ActionCard`/`KanbanCard`.
Action → suivre le plan déjà défini dans `docs/AUDIT.md` (11 sept 2026), pas de nouvelle analyse nécessaire.
Effort → plusieurs jours, déjà planifié par étapes.
Gain → maintenabilité, réduction du risque de régression sur le module le plus critique (persistance).

## Priorité 3 — Veille, pas d'action immédiate

**8. Pas de lib partagée `indx-core` justifiée pour l'instant**
Constat → stacks trop différentes entre les 3 repos (notepad = vanilla/static, hub = React/Vite, management = React+Supabase) : aucune duplication de code cross-repo significative détectée, hors le pattern `SupabaseStoreProvider` qui pourrait devenir un candidat si un 4e repo backend Supabase apparaît.
Action → aucune maintenant ; réévaluer à la création du prochain repo Supabase.

**9. Template CI unique**
Constat → 3 configurations CI hétérogènes (GH Actions pur, GH Actions+Supabase, GitLab-only) — cohérent avec P1.1, mais pas de template à formaliser tant qu'il n'y a que 3 repos avec des besoins différents.
Action → réévaluer une fois P1.1 traité.

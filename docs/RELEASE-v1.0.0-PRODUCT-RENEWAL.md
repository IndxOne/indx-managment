# Release v1.0.0 — Product Renewal

## 1. Version
`v1.0.0-product-renewal`

## 2. Date
13 septembre 2026

## 3. Commit / tag
Tag annoté `v1.0.0-product-renewal` → commit `e5e1fda6f36941489929da76c3fd36596040c77c` (HEAD de `main`, hotfix inclus). Tag créé localement ; **non poussé sur le dépôt distant** — voir note en fin de document.

## 4. Résumé fonctionnel
- Navigation simplifiée : Accueil / Projets / Cette semaine / Rappels + menu secondaire.
- Home opérationnel : Aujourd'hui / En retard / Bloqué / aperçu Semaine.
- RUN et PROJET harmonisés (onglets partagés, filtres communs).
- Vue Colonnes responsive (desktop côte à côte, mobile scroll horizontal natif), création rapide inline.
- ActionDetail unifié (sheet mobile / drawer desktop), remplace 7 chemins d'édition dispersés.
- Statut `blocked` ajouté (todo/doing/blocked/waiting/done).
- Collaboration légère V1 : membres = étiquettes d'organisation (jamais des comptes), assignation, filtre Responsable, indicateur discret sur les cartes.
- Corrections accessibilité/contraste (cibles tactiles, contraste WCAG AA sur le texte réellement affecté).
- Correctifs production post-déploiement : contrainte `approach` (client_web) et id d'occurrence de récurrence (uuid déterministe).

## 5. Résumé technique
Architecture inchangée dans ses invariants : domaine pur, reducer partagé, deux adaptateurs interchangeables (mémoire / Supabase), zéro dépendance ajoutée (`react`, `react-dom`, `@supabase/supabase-js` uniquement). 411 tests (Vitest + Testing Library), typecheck et lint stricts, build PWA fonctionnel. Code mort retiré en fin de chantier avec preuve (pas par précaution).

## 6. Migrations DB
16 migrations versionnées dans `supabase/migrations/`, toutes appliquées et vérifiées en base :

```
20260425190353_create_sync_snapshots
20260908101148_create_projets_tables
20260908111630_extend_item_type_decision_risk
20260908131326_add_notes_to_projets_actions
20260908134321_add_linked_action_to_projets_actions
20260908202005_create_projets_recurrence_rules
20260909072846_create_projets_carnet_notes
20260909134358_revoke_public_execute_rls_auto_enable
20260909135232_fix_rls_auth_initplan_perf
20260909135244_add_missing_fk_indexes
20260910084347_projets_push_reminders
20260910085957_projets_push_reminders_hardening
20260910215054_hub_settings
20260911134521_extend_status_blocked
20260911152324_create_projets_members
20260913000000_fix_workspaces_approach_check
```

Aucune migration en attente. Aucune donnée existante modifiée par les migrations de ce cycle (DDL pur pour le hotfix `approach`).

## 7. Environnement Supabase
Projet cible confirmé : **indxone-Hub** (`wdxvhceddrtxworblfec`), sert `projets.indxone.com`. RLS active sur les 7 tables `projets_*`, une policy `ALL` cohérente par table, isolation par en-tête `x-user-hash`.

## 8. Validation production
Build/typecheck/lint/tests verts sur `main`. Déploiement Netlify (site `indxone-projets`) réussi après résolution d'un faux positif du scanner de secrets (URL Supabase déjà publique détectée dans une migration). Validation fonctionnelle réelle contre la base de production sous RLS normale (écriture/lecture/mise à jour/suppression de données de test créées et nettoyées immédiatement) : persistance d'actions, statut `blocked`, membres, assignation, filtre Responsable, isolation par hash.

## 9. Smoke test réalisé
Smoke test manuel réalisé sur `projets.indxone.com` (desktop + mobile) : navigation, Home, RUN, PROJET (Colonnes + Semaine), ActionDetail, collaboration (Solo → Équipe, membre, assignation, filtre), persistance après rechargement. Complété par une validation directe en base (RLS respectée) pour les scénarios nécessitant un contrôle exact des données (création/mise à jour `client_web`, matérialisation et rematérialisation d'occurrence).

## 10. Bugs production corrigés
- **Contrainte `projets_workspaces_approach_check`** : n'autorisait pas `client_web` (présent côté application depuis le renouveau, jamais reporté côté contrainte DB) — migration versionnée appliquée, contrainte conservée comme protection d'intégrité, aucune donnée modifiée.
- **Id d'occurrence de récurrence invalide** : `${rule.id}__${date}` (texte) rejeté par la colonne `uuid` — remplacé par un uuid v5 déterministe (SHA-1 pur, sans dépendance, validé contre le vecteur de test RFC 4122 officiel), même garantie d'idempotence conservée.

## 11. Limites connues
- Pas d'authentification réelle : modèle `x-user-hash` (secret partagé côté client), pas de compte vérifié serveur — documenté en détail dans `docs/LOT8A-COLLABORATION-SECURITY.md`.
- Pas de mode hors-ligne durable : la file de retry couvre une coupure réseau courte pendant que l'onglet reste ouvert, rien ne survit à la fermeture de l'onglet.
- Navigation sans historique navigateur (pas d'URL profonde).
- Assignation/filtre Responsable limités à RUN et PROJET, non étendus aux vues transversales (Home, Semaine agrégée, Recherche).
- Mise à jour de service worker différée tant qu'un onglet ouvert avant le déploiement reste actif (comportement standard du cycle de vie Service Worker, choix assumé pour ne jamais interrompre une saisie en cours) — fermeture complète puis réouverture nécessaire pour voir la nouvelle version.

## 12. Compatibilités legacy
**`LEGACY_PHASE_ALIASES` (`src/app/utils/resolve-phase.ts`) toujours requise et active.** Vérifié en base au moment de cette release : 12 des 31 actions de production portent encore un `phase_id` historique (`ateliers`, `validations`, `restitutions`, `realisations`) que seule cette table de correspondance sait résoudre à l'affichage. **Ne jamais retirer** tant qu'une migration de données n'a pas explicitement réécrit ces valeurs — aucune n'a été faite ni planifiée à ce jour.

## 13. Rollback
- **Git** : commit `main` précédent le renouveau = `2fbc18e`. Pour revenir avant le hotfix uniquement, commit `68abd6d` (merge Product Renewal) ou `8dd137e` (avant hotfix). Toujours par `git revert`, jamais par reset destructif sur une branche partagée.
- **Netlify** : chaque déploiement reste restaurable en un clic depuis le dashboard (site `indxone-projets`) — aucune action Supabase requise pour un rollback front pur.
- **Base de données** : aucun rollback de migration recommandé. Les migrations `blocked`, `projets_members` et `fix_workspaces_approach_check` portent ou protègent des données réelles de production. En cas de problème applicatif, revenir sur le code/déploiement suffit toujours ; jamais d'action destructive sur la base en premier réflexe.

## 14. Dette technique
- `SupabaseStoreProvider` volumineux (729 lignes), jamais découpé par ressource (proposé dès l'audit initial, jamais priorisé).
- `global.css` volumineux (2134 lignes), toujours monolithique (refactor CSS Modules explicitement hors scope de tous les lots à ce jour).
- Seuil desktop/mobile (1024px) dupliqué entre CSS et JS (`useIsDesktop` via `matchMedia`), jamais unifié en source unique.
- Deux écarts de contraste mineurs non corrigés (`--color-danger` en petit texte de bouton, `--color-accent` en texte sur fond sombre) — passent le seuil "grand texte/UI" (3:1) mais pas le seuil texte normal (4.5:1), non traités pour limiter le rayon d'impact visuel d'un token multi-usages.
- Pas de Prettier/formatter configuré.

## 15. Points à surveiller après release
- Erreurs Supabase (contraintes, RLS) sur les 7 jours suivant la mise en production — voir `docs/POST-PROD-OBSERVATION.md`.
- Adoption réelle de la collaboration légère (mode Équipe activé ou non) et du filtre Responsable.
- Toute nouvelle valeur `ProfessionalApproach` ajoutée côté code sans mise à jour correspondante de la contrainte DB (même classe de bug que le hotfix `client_web` — à vérifier systématiquement lors de tout ajout de préréglage métier).
- Sessions PWA affichant une navigation obsolète après un futur déploiement (comportement attendu, pas une alerte en soi, mais à corréler avec d'éventuels signalements utilisateur).

---

## Verdict

## **PROD VALIDÉE**

---

## Note sur le tag et la release GitHub

Le tag annoté `v1.0.0-product-renewal` a été créé localement (pointant sur
`e5e1fda`) mais **n'a pas pu être poussé sur le dépôt distant** :
`git push` sur la référence de tag renvoie une erreur HTTP 403 (les
pushes de branche, eux, fonctionnent normalement avec les mêmes
identifiants — la restriction semble spécifique aux références de tag).
Aucun outil disponible dans cet environnement ne permet de créer un tag
ou une release GitHub par un autre chemin (API).

**Action requise côté dépôt** (avec des identifiants disposant des droits
nécessaires) :

```
git tag -a v1.0.0-product-renewal e5e1fda6f36941489929da76c3fd36596040c77c -m "INDXONE Projets — Product Renewal v1.0.0"
git push origin v1.0.0-product-renewal
```

Puis créer la release GitHub associée (titre "INDXONE Projets — Product
Renewal v1.0.0", corps = sections 4, 6, 7, 11, 13, 16 de ce document).

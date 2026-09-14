# Lot 0 — Registre des risques (actualisé)

Registre issu de l'audit initial (`docs/AUDIT.md`), actualisé avec les
ajustements obligatoires validés pour le Lot 1 (Auth Supabase OTP).
Aucun de ces risques n'a été traité par du code au Lot 0 — seuls des
tests de caractérisation et cette documentation ont été produits.

## Risques déjà présents (avant toute migration)

| # | Risque | Cause | Scénario d'exploitation | Probabilité | Impact | Mesure temporaire | Mesure définitive | Propriétaire |
|---|---|---|---|---|---|---|---|---|
| R1 | Usurpation totale de compte | `x-user-hash` = secret client, non signé, vérifié par RLS comme s'il s'agissait d'une identité (`supabase/migrations/*.sql`, policies "own *") | Vol du localStorage (XSS, code de synchro partagé au mauvais endroit) → accès CRUD complet à `projets_workspaces`, `projets_actions`, `projets_members`, `projets_hub_settings`, `projets_recurrence_rules`, `projets_carnet_notes` | Faible-moyen | Élevé | Aucun changement au Lot 0-1 (mécanisme conservé tel quel par décision explicite) | Migration RLS vers `auth.uid()` (lot séparé, hors périmètre) | Koffi |
| R2 | Absence de traçabilité | Pas de journal d'audit, `user_hash` seul identifiant, pas de nom d'utilisateur réel | Modification/suppression sans savoir "qui" a agi | Élevé (déjà le cas) | Moyen | Aucune | Journal d'audit (lot séparé, hors périmètre) | — |
| R3 | Table `sync_snapshots` dormante avec la même exposition RLS | Aucune référence trouvée dans `src/` (grep négatif) — mécanisme probablement obsolète, jamais confirmé | Si un client externe (script, ancienne version de l'app) l'utilise encore sans qu'on le sache, même exposition que R1 | Faible | Faible-moyen | À confirmer avant tout lot de nettoyage — ne pas supprimer sans certitude | Décision de suppression ou de rattachement, au lot de nettoyage (hors périmètre Lot 0-1) | Koffi |

## Risques introduits par le Lot 1 (Auth Supabase OTP) — anticipés, pas encore existants

| # | Risque | Cause | Scénario d'exploitation | Probabilité | Impact | Mesure temporaire | Mesure définitive | Propriétaire |
|---|---|---|---|---|---|---|---|---|
| R4 | Inscription libre non désirée | `signInWithOtp` par défaut crée un compte si l'email est inconnu | N'importe quelle adresse email peut créer un compte Auth non autorisé | Élevé si non traité | Moyen (comptes fantômes, aucun accès data au Lot 1 mais confusion/risque futur) | — | **Ajustement obligatoire acté** : `options: { shouldCreateUser: false }` sur l'appel `signInWithOtp`, comptes autorisés créés séparément (hors périmètre Lot 0-1, à faire par le propriétaire côté Dashboard/Admin API) | Koffi (validation avant Lot 1) |
| R5 | Fuite du lien de confirmation dans le corps de l'email OTP | Template Supabase par défaut peut inclure `{{ .ConfirmationURL }}` (magic link), plus large que le code à 6 chiffres attendu | Un lien cliquable dans l'email est plus facilement relayable/hameçonnable qu'un code à saisir manuellement | Moyen si template par défaut conservé | Faible-moyen | — | **Ajustement obligatoire acté** : template Supabase Dashboard à modifier pour utiliser `{{ .Token }}` (code OTP) et non `{{ .ConfirmationURL }}` seul — action Dashboard, hors du dépôt, à faire par le propriétaire avant Lot 1 | Koffi |
| R6 | Fausse impression de sécurisation | Un écran de connexion visible en production, alors que `auth.uid()` n'est pas encore rattaché aux données et que les RLS sécurisées ne sont pas actives, donnerait l'illusion trompeuse que les données sont protégées par compte | Un utilisateur (ou l'agent externe pressenti) pense être isolé par son compte alors que l'accès reste piloté par `user_hash` partagé | Moyen si l'écran est exposé trop tôt | Élevé (confusion pouvant mener à un partage d'accès cru "sécurisé") | — | **Ajustement obligatoire acté** : `AuthScreen` doit rester inaccessible en production tant que (a) `auth.uid()` n'est pas rattaché aux données, (b) les RLS sécurisées ne sont pas actives, (c) `user_hash` reste l'autorité d'accès — accessible seulement en dev/test au Lot 1 | Revue de code obligatoire avant toute route de production vers `AuthScreen` |
| R7 | Confusion `auth.uid()` / `user_hash` dans le code | Deux identités actives en parallèle après le Lot 1 | Un développeur (humain ou agent) branche par erreur une requête ou une policy sur `auth.uid()` avant le lot de rattachement | Moyen | Élevé (perte d'accès aux données existantes) | Convention de nommage stricte (`authUserId` vs `userHash`, jamais un nom neutre) + revue systématique | Lot de migration dédié qui rattache explicitement `auth.uid()` ↔ `user_hash` | Revue de code obligatoire sur chaque commit Lot 1 |
| R8 | Régression du flux existant pendant le Lot 1 | Ajout d'un provider/écran au-dessus de l'app actuelle (`App.tsx`) | Un changement dans le routing casse le boot `TemporaryStoreProvider`/`SupabaseStoreProvider` existant | Moyen | Élevé (app inutilisable) | Tests de caractérisation Lot 0 (`user-hash.test.ts`, `client.test.ts`, `provider-selection.test.tsx`, `supabase-store.test.tsx`) exécutés après chaque commit Lot 1 | — | — |

## Statut au sortir du Lot 0

Aucun de ces risques n'est levé par le Lot 0 (attendu — le Lot 0 caractérise
et documente, il ne corrige rien). Ce registre sert de checklist d'entrée
pour le Lot 1 : R4, R5, R6 doivent être vérifiés effectivement en place
avant toute mise en production de l'écran Auth.

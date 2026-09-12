# Lot 8.1 — Validation navigateur réel

## Méthode

Playwright (paquet Python, installé le temps de la session — **pas ajouté
comme dépendance du projet**, `package.json` inchangé) piloté contre le
Chromium déjà pré-installé dans l'environnement
(`/opt/pw-browsers/chromium-1194`), lancé en headless contre
`npm run dev` en local. Deux viewports : desktop (1440×900) et mobile
(390×844).

## Résultats automatisés (réels, headless Chromium — pas jsdom)

Sur les deux viewports :

- [x] Solo → Équipe (bascule immédiate, section Membres apparaît)
- [x] Ajout de membre (Koffi, puis Alice)
- [x] Renommage de membre (Koffi → "Koffi N.")
- [x] Désactivation de membre (Alice)
- [x] Assignation depuis ActionDetail (rangée "Responsable" → sélecteur → coché)
- [x] Carte avec indicateur compact d'initiales ("KN"), discret, sans wrap
- [x] Filtre Responsable en PROJET (vue Colonnes) : sélection membre → liste filtrée ; retour à "Tous" → liste complète
- [x] Aucune erreur console/page JS pendant tout le parcours
- [x] Cibles tactiles/mise en page mobile : pas de débordement horizontal, lignes ≥44px, sheets lisibles à 390px

Captures dans `/tmp/desktop-*.png` et `/tmp/mobile-*.png` (session locale,
non versionnées).

## Non testable dans cette sandbox : reload/persistance réelle

Cette sandbox locale ne configure pas les variables Supabase : `App.tsx`
sélectionne donc `TemporaryStoreProvider` (état 100% mémoire, sans
persistance — comportement antérieur au Lot 8B, pas une régression). Un
reload y efface tout l'état, y compris hors collaboration. Le mapping
Supabase (round-trip membres/assignations) est lui déjà couvert par les
tests unitaires (`mappers.test.ts`, `supabase-store.test.tsx`).

**Checklist manuelle à faire sur `projets.indxone.com` (ou tout
environnement avec Supabase configuré) :**

1. Activer le mode Équipe sur un espace PROJET, ajouter 2 membres.
2. Assigner une action à un membre depuis ActionDetail.
3. Recharger complètement la page (F5 / pull-to-refresh mobile).
4. Vérifier que : le mode Équipe est toujours actif, les 2 membres sont
   toujours listés, l'assignation est toujours affichée sur la carte et
   dans ActionDetail.
5. Désactiver un membre déjà assigné, recharger : vérifier qu'il reste
   visible sur l'action (étiquette "Inactif") mais n'apparaît plus comme
   option pour une nouvelle assignation.
6. Vérifier l'isolation multi-appareil : ouvrir le même espace depuis un
   autre navigateur/hash `x-user-hash` ne doit montrer aucune donnée
   (cf. doc Lot 8A sur la sécurité du modèle).

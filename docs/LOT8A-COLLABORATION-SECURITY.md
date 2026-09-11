# Lot 8A — Modèle membres : limites de sécurité et décision requise avant Lot 8B

## Pré-check environnement Supabase

`projets.indxone.com` (Netlify `indxone-projets`) est confirmé configuré sur
le projet Supabase **`indxone-Hub`** (`wdxvhceddrtxworblfec`) — même projet
que celui utilisé pour la migration `blocked` du Lot 6. Confirmé par
correspondance exacte des suffixes de clé/URL entre les variables
d'environnement Netlify (masquées) et les valeurs réelles du projet
Supabase (`sb_publishable_..._h_NH`, `...wdxvhceddrtxworblfec.supabase.co`).
C'est une **décision volontaire déjà documentée** (`docs/PRODUCT-RENEWAL-BASELINE.md`
§1, commentaire d'origine dans `20260908101148_create_projets_tables.sql` :
"réutilisé pour limiter les coûts"). Aucune incohérence — pas de STOP requis
sur ce point.

Tables `projets_*` présentes sur `indxone-Hub` : `projets_workspaces`,
`projets_actions`, `projets_recurrence_rules`, `projets_carnet_notes`,
`projets_push_subscriptions`, `projets_hub_settings`, + `sync_snapshots`
(hors périmètre projets). Les 7 ont RLS activé, policy `FOR ALL` unique
par table, forme identique (`user_hash = ...x-user-hash...`).

## Le modèle d'isolation actuel (x-user-hash)

- `getOrCreateUserHash()` génère un `crypto.randomUUID()` stocké en
  `localStorage`, par navigateur — **aucun compte, aucun mot de passe,
  aucune identité signée**.
- Chaque requête Supabase porte ce hash en en-tête `x-user-hash` ; chaque
  policy RLS `projets_*` compare `user_hash = <en-tête>`.
- `setUserHash()` permet de **définir manuellement** n'importe quel hash sur
  un appareil ("retrouver ses données depuis un autre navigateur") — sans
  aucune vérification.
- Ce choix est déjà documenté dans le code (`supabase-store.tsx`, commentaire
  d'en-tête) : *"la garantie est celle d'un secret partagé (comme une clé
  d'API), pas d'une identité signée JWT. Suffisant pour un outil
  personnel/solo ; à revoir si le produit doit un jour accueillir plusieurs
  utilisateurs non éditeurs de confiance."*

## Conséquence directe pour la collaboration Lot 8

Connaître (ou recevoir) le `x-user-hash` d'un espace donne un accès
**total, non différencié, à TOUTES les données de ce hash** — pas seulement
à l'espace "équipe" visé. Il n'existe :
- aucune notion de compte séparé par personne ;
- aucune façon de révoquer l'accès d'une seule personne sans changer le
  hash pour tout le monde (y compris le propriétaire d'origine) ;
- aucun journal de qui a fait quoi (toutes les écritures portent le même
  `user_hash`) ;
- aucune granularité par espace (un hash partagé = accès à TOUS les
  espaces RUN/PROJET de son propriétaire, pas seulement à celui visé).

**Une UI "Équipe" qui laisserait croire à une collaboration sécurisée entre
comptes distincts, alors qu'elle ne fonctionne en réalité que par partage
d'un secret unique entre appareils, serait trompeuse** — c'est exactement
la situation que ce lot demande de ne jamais masquer.

## Décision : le modèle "Membre" du Lot 8A n'est PAS un compte

Pour rester honnête vis-à-vis de cette limite sans renoncer à la valeur
produit de la Cible V1 (assignation, filtre, affichage responsable), le
membre créé par ce lot est **une étiquette nommée pour l'organisation du
travail** (comme un tag "propriétaire"), pas un utilisateur qui se connecte.
Un membre n'a ni identifiant de connexion, ni session, ni accès propre :
la personne qui édite reste toujours celle qui détient le `x-user-hash`
de l'espace, qu'un membre lui soit assigné ou non.

Ce choix :
- respecte la Cible V1 telle que formulée (aucun des 5 points listés
  n'exige de compte séparé) ;
- ne dégrade ni n'invente de sécurité (le modèle x-user-hash n'est ni
  amélioré ni aggravé par l'ajout de la table `projets_members`) ;
- reste honnête : "Équipe" dans ce produit signifie *"named collaborators
  for organization/assignment, edited by whoever holds this workspace's
  access"*, jamais *"comptes séparés et protégés"*.

## Options d'architecture pour une vraie collaboration multi-comptes

| Option | Description | Effort | Statut |
|---|---|---|---|
| **A. Rester sur x-user-hash + membres = étiquettes** | Ce que ce lot livre. Un seul éditeur de confiance (ou un secret explicitement partagé entre personnes de confiance), membres = organisation, pas d'accès différencié. | Fait (8A) | **Recommandé pour le V1** |
| **B. Supabase Auth + RLS par (workspace, membre authentifié)** | Vrais comptes (email/magic link), table de liaison `workspace_id / auth.uid()`, policies RLS réécrites pour vérifier l'appartenance réelle. Révocation par personne possible. | Changement d'architecture majeur (auth, onboarding, migration des données existantes vers des comptes) | Hors périmètre de ce lot — nécessite validation explicite |
| **C. Partage de hash documenté comme "code d'accès"** | Garder x-user-hash, mais l'UI nomme explicitement la limite ("toute personne avec ce code voit tout") au lieu de l'appeler "compte membre". | Faible | Envisageable si le produit veut vraiment plusieurs éditeurs physiques avant d'investir dans B |

**Recommandation** : Option A pour ce lot. Option B si/quand le produit a
un besoin réel et validé de comptes séparés avec révocation — c'est un
chantier d'authentification à part entière, explicitement hors périmètre
ici ("pas de changement d'auth non validé explicitement").

## Impact sur le Lot 8B

Avec l'Option A, le Lot 8B (UX assignation/filtre) peut être livré tel que
spécifié dans le brief — aucun de ses écrans ne prétend offrir des comptes
séparés, uniquement de l'assignation/filtrage par étiquette nommée. Le
copy UI de la Phase N (Solo/Équipe) devra rester fidèle à cette réalité
(ex. ne jamais afficher "invitez votre équipe" comme s'il s'agissait d'un
compte séparé et protégé).

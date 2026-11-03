# Plan d'observation — 7 jours post-release v1.0.0

Aucune télémétrie n'existe dans le code (vérifié : ni Sentry, ni
analytics, ni équivalent). Conformément à la consigne de ne pas ajouter
de télémétrie intrusive pour cette release, ce plan est une **checklist
d'observation manuelle**, à rejouer quotidiennement pendant 7 jours à
partir du 13 septembre 2026 (fin le 20 septembre 2026).

## Sources d'observation disponibles sans nouvel outillage

1. **Logs Supabase** (`mcp__Supabase__get_advisors` + logs projet
   `wdxvhceddrtxworblfec`) — erreurs de contrainte, RLS, requêtes en échec.
2. **Dashboard Netlify** (site `indxone-projets`) — erreurs de build,
   erreurs 4xx/5xx sur les assets, statut des déploiements.
3. **Console navigateur** — à vérifier manuellement lors de chaque usage
   réel de l'application (pas de collecte automatique).
4. **Table `projets_actions`/`projets_workspaces`/`projets_members`** —
   comptages directs pour détecter une création en échec silencieuse
   (ex. un workspace `client_web` qui n'apparaîtrait jamais malgré une
   tentative de création).

## Checklist quotidienne (5-10 minutes)

### Erreurs / stabilité
- [ ] Erreurs Supabase nouvelles (`get_advisors` security + performance) —
      comparer au relevé de référence de la release (3 avertissements
      pré-existants connus, aucun nouveau attendu).
- [ ] Erreurs console lors d'un usage réel de l'app (ouvrir, naviguer,
      créer une action) — noter tout message rouge inattendu.
- [ ] Conflits de synchronisation signalés par l'UI (bannière de
      conflit) — fréquence et contexte (déconnexion réseau, double
      édition ?).
- [ ] Échecs de création de workspace — en particulier `client_web`
      (bug corrigé, à confirmer stable sur la durée).
- [ ] Échecs de création/matérialisation de récurrence.
- [ ] Lenteurs perçues (chargement Home, Columns, ouverture ActionDetail).
- [ ] Débordements ou mise en page cassée sur mobile (largeur réelle du
      téléphone utilisé, pas seulement un simulateur).

### Usage réel (pour alimenter les décisions V1.1)
- [ ] Navigation : la nouvelle structure (Accueil/Projets/Semaine/Rappels)
      est-elle comprise sans hésitation ? Noter toute confusion observée.
- [ ] Friction à la création d'une action ou d'un espace (temps pris,
      hésitation, annulation).
- [ ] Le filtre Responsable est-il utilisé au moins une fois ? Dans
      quelle vue (RUN, PROJET Colonnes, PROJET Semaine) ?
- [ ] Répartition d'usage RUN vs PROJET (nombre d'espaces actifs de
      chaque type, fréquence d'ouverture).
- [ ] Usage de Home : consultée régulièrement, ou uniquement les vues
      d'espace individuelles ?
- [ ] Mode Équipe activé sur au moins un espace ? Combien de membres
      créés ? Assignations effectuées ?

## Points de vérification ciblés (liés aux correctifs de ce cycle)

- [ ] Au moins une action `blocked` créée et toujours visible après
      plusieurs jours (persistance confirmée en usage réel, pas
      seulement en test).
- [ ] Au moins un espace `client_web` créé en usage réel (le bug corrigé
      n'a été validé qu'en test synthétique + smoke test manuel court).
- [ ] Si une récurrence est créée en usage réel : ses occurrences
      apparaissent bien, aucune erreur d'insertion.
- [ ] Une action portant un `phase_id` historique (`ateliers`,
      `validations`, `restitutions`, `realisations`) s'affiche toujours
      correctement dans sa colonne de phase actuelle.

## À la fin des 7 jours

Consolider ce qui a été observé (ou son absence) en un court bilan :
nombre d'erreurs réelles rencontrées, frictions confirmées vs signalées
sans preuve, usage réel des fonctionnalités de collaboration/filtres.
Ce bilan alimente directement l'arbitrage des priorités **P1
conditionnelles** de `docs/V1.1-BACKLOG.md` (items G et J notamment, qui
attendent explicitement ce signal avant tout développement).

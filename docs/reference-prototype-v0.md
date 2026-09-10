# Prototype de référence v0

Prototype exploratoire (vanilla JS, `app.js`/`model.js`) servant de source
d'inspiration UX pour plusieurs chantiers. URL :
`indxone-projets-prototype-v0.contact96248.chatgpt.site`.

## Déjà repris

- **Modal "Nouveau projet" minimal** (`CreateWorkspaceScreen`) : un nom
  suffit pour démarrer, l'approche métier est déduite de la nature
  (RUN/PROJET) plutôt que demandée, modifiable ensuite dans les réglages.
- **Dialogue centré + fond flouté** (`.sheet`/`.sheet-backdrop`) : même
  esprit que son `<dialog>` natif (`dialog::backdrop{blur(2px)}`).

## Éléments à évaluer pour de futures reprises

- **Carte projet** (`renderProjects`) : nom, description/objectif, compteur
  "N actions · M terminées", mode d'organisation en lien cliquable
  ("Par étapes →" / "Par semaine →") — proche de notre `WorkspaceCard`
  actuelle, à comparer champ à champ si on la fait évoluer.
- **Kanban** (`renderProject`) : bascule d'onglets "Par étapes"/"Par
  semaine" avec `aria-pressed`, sélecteur de colonne dédié mobile
  (`<select id="column-picker">`) au lieu du scroll horizontal — piste pour
  améliorer le Kanban mobile.
- **Rappels** (`renderReminders`) : deux blocs "règle" (relance après N
  jours d'attente, répétition hebdomadaire) avec switch d'activation +
  sélecteur d'action ciblée — modèle plus simple que nos écrans actuels.
- **Approches métier** (`renderRoles`) : présente 3 profils (Pilotage,
  Produit & Tech, Management) avec pour chacun des vues suggérées et un
  "signal" (ce qui compte pour ce profil), plus un principe transverse
  "Solo ou équipe" indépendant du métier — à recroiser avec notre
  `PRESET_REGISTRY` si on enrichit le choix d'approche.
- **Hub** (`renderHub`) : rattache un projet à un objectif de revenu / TJM
  / trésorerie prévisionnelle — hors scope actuel, mais donne une piste
  pour une future intégration Hub.
- **Carnet** (`renderCarnet`) : notes liées à un projet avec bouton
  "Créer une action liée" par note — cohérent avec notre flux Carnet→Action
  existant.

## Non pertinent pour nous

- Persistance `localStorage` brute (`indxone-projets-demo-v1`) — nous
  utilisons Supabase.
- Undo générique par `toast` — hors scope actuel.

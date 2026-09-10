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
- **Carte projet** (`WorkspaceListScreen`/`WorkspaceCard`) : titre "Mes
  projets" + sous-titre, bouton plein "+ Nouveau projet", cartes compactes
  (nom, description, "N actions · M terminées", "Par étapes/semaine →")
  sans badge ni bordure colorée.
- **Kanban : bascule Phase/Semaine** (`ProjectWorkspaceScreen`) : deux
  onglets segmented toujours visibles (`aria-selected`), au lieu d'un
  bouton qui changeait de libellé. Le sélecteur de colonne mobile dédié du
  prototype n'a pas été repris : notre vue mobile utilise déjà des chips
  de phase + liste complète par phase, pas de scroll horizontal Kanban à
  remplacer.
- **Rappels** : phrase d'intro ajoutée, mais le modèle de règle globale à
  interrupteur du prototype n'est pas repris — nos relances restent par
  action, sur une vraie liste interactive (déplacer/éditer/notes/lien).
- **Approches métier** : nouvel écran (Plus → Approches métier + lien
  direct sidebar desktop) avec les 5 approches réelles de
  `PRESET_REGISTRY`, eyebrow/grille/panneau "Solo ou équipe" alignés sur
  le rendu du prototype, mais données réelles (pas de contenu fictif).
- Sidebar desktop réordonnée : Espaces, Aujourd'hui, Semaine, Rappels,
  Approches métier, Plus, puis "Mes espaces".

## Éléments à évaluer pour de futures reprises

- **Hub** (`renderHub`) : rattache un projet à un objectif de revenu / TJM
  / trésorerie prévisionnelle — hors scope actuel, mais donne une piste
  pour une future intégration Hub.
- **Carnet** (`renderCarnet`) : notes liées à un projet avec bouton
  "Créer une action liée" par note — cohérent avec notre flux Carnet→Action
  existant, rien d'identifié à changer pour l'instant.

## Non pertinent pour nous

- Persistance `localStorage` brute (`indxone-projets-demo-v1`) — nous
  utilisons Supabase.
- Undo générique par `toast` — hors scope actuel.

# Direction artistique « Atelier »

Objectif : un outil qu'un non-technicien comprend sans formation, sur téléphone d'abord.

## Principes

1. **Une seule couleur d'action** : le terracotta de la marque. Ce qui est terracotta se touche.
2. **Papier chaud, encre marine** : fond `#f6f5f1`, texte `#0c1823` (couleurs du logo).
3. **Calme** : cartes blanches, ombres légères, rayons 14–22 px. Pas d'arc-en-ciel d'icônes.
4. **Mots du quotidien** : « Suivi » (et non RUN), « Notes », « Relances », « Plus ».
5. **Pouce d'abord** : 4 onglets + bouton central « Créer », cibles ≥ 44 px, retour arrière natif.

## Tokens (extrait)

| Rôle | Clair | Sombre |
| --- | --- | --- |
| `--color-page` | `#f6f5f1` | `#101214` |
| `--color-bg` (cartes) | `#ffffff` | `#1a1d21` |
| `--color-text` | `#0c1823` | `#f1f0ec` |
| `--color-text-muted` | `#5b6170` | `#9da3ad` |
| `--color-accent` (fonds/boutons) | `#ad4426` | `#b9502f` |
| `--color-accent-text` (texte/liens) | `#ad4426` | `#ff9b78` |

Source de vérité : `src/app/styles/global.css` (bloc `:root` + 2 blocs sombres identiques).

## Contrastes vérifiés (WCAG AA ≥ 4.5:1)

| Paire | Ratio |
| --- | --- |
| Texte / page (clair) | 16.4 |
| Muted / carte (clair) | 6.2 |
| Blanc / accent (clair) | 5.8 |
| Accent / page (clair) | 5.3 |
| Blanc / accent (sombre) | 4.9 |
| Accent-texte / carte (sombre) | 8.2 |

Règle : texte coloré → `--color-accent-text`, jamais `--color-accent` (réservé aux fonds).

## Navigation

| Mobile | Contenu |
| --- | --- |
| Accueil | Date du jour, ce qui demande une action |
| Suivi | Espaces de tâches courantes |
| ＋ | Création rapide |
| Projets | Projets à étapes |
| Plus | Cette semaine, Relances, Mon Brief, Notes, Recherche, Réglages |

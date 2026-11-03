# INDXONE Projets — « Aurore »

Une app qui pense comme vous : en **moments**, pas en dossiers.

## Expérience (UX)

| Principe | Mise en œuvre |
| --- | --- |
| **Une question à l'ouverture** : que faire maintenant ? | Écran *Aujourd'hui* = carte **Focus** (une seule action) + couloirs *Maintenant / Bientôt / En attente / Un jour*, tous espaces mélangés. |
| **Écrire comme on parle** | Compositeur toujours visible : « Appeler Paul demain ! #mariage » → date, priorité, espace compris en direct (aperçu en pastilles). Parseur local, sans serveur ni IA externe (`src/domain/capture/parse-capture.ts`). |
| **Dicter** | Bouton micro (Web Speech API du navigateur), si disponible. |
| **Zéro configuration** | Aucun espace à créer d'abord : « Mes actions » est créé à la volée ; `#nouveau` crée l'espace. |
| **Un geste = une décision** | Cercle = terminé (retour haptique + annuler), « Demain » = reporter. |
| **Progrès visible** | Anneau du jour : terminées / prévues. |
| **Natif** | Retour arrière du téléphone, transitions d'écran natives (View Transitions), PWA installable. |

### Syntaxe du compositeur

| Vous écrivez | Compris comme |
| --- | --- |
| `aujourd'hui`, `ce soir`, `demain`, `après-demain` | jour |
| `lundi` … `dimanche`, `dans 3 jours`, `12/11`, `12 nov` | jour |
| `cette semaine`, `semaine prochaine`, `ce mois`, `mois prochain` | semaine / mois |
| `!`, `urgent`, `important`, `prioritaire` | prioritaire |
| `en attente`, `@attente` | en attente |
| `#mot` | espace (créé s'il n'existe pas) |

## Interface (UI)

1. **Lumière ambiante** : le fond change avec le moment (aube, jour, soir, nuit — `html[data-moment]`).
2. **Verre dépoli** : navigation et compositeur flottants, translucides (`backdrop-filter`).
3. **Une seule couleur d'action** : la braise de la marque (`--color-accent`), en dégradé sur l'action principale.
4. **Typo d'affichage** : 44 px, approche serrée ; polices système (0 Ko téléchargé).
5. **Calme** : pas de bordures dures, ombres diffuses, texte au lieu de pastilles.

## Tokens (extrait)

| Rôle | Clair | Sombre |
| --- | --- | --- |
| `--color-page` | `#f1ece6` | `#0c0b11` |
| `--color-bg` (verre) | `rgba(255,255,255,.8)` | `rgba(28,26,36,.85)` |
| `--color-bg-solid` (couches) | `#fbfaf8` | `#1c1a24` |
| `--color-text` | `#14121a` | `#f3f0f7` |
| `--color-text-muted` | `#5d5868` | `#a29db0` |
| `--color-accent` | `#b8401f` | `#c24a26` |
| `--color-accent-text` | `#a83c20` | `#ff9b78` |

## Contrastes vérifiés (WCAG AA ≥ 4.5:1)

| Paire | Clair | Sombre |
| --- | --- | --- |
| Texte / carte | 17.8 | 15.4 |
| Secondaire / carte | 6.6 | 6.6 |
| Accent-texte / carte | 6.1 | 8.5 |
| Blanc / accent | 5.5 | 4.9 |

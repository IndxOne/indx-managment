# Direction artistique « Encre & Papier »

Rupture assumée avec le style iOS (cartes ombrées, barre système bleue).
Objectif : un outil lisible par un non-technicien, sur téléphone d'abord.

## Principes

1. **Plat, cerné d'encre** : aucune ombre floue. Cartes, boutons secondaires, onglets = trait d'encre 1,5 px (`--line`).
2. **Trois couleurs** : papier kraft, encre presque noire, terracotta de marque (logo). Le terracotta signale l'action principale (Créer, onglet actif, focus).
3. **Encre = choix fait** : bouton principal, onglet sélectionné, filtre actif → fond encre, texte papier.
4. **Typo éditoriale** : titres 40 px gras serrés ; étiquettes de section en monospace capitales suivies d'un filet.
5. **Navigation capsule** : barre flottante encre (papier en mode sombre), 4 onglets + bouton terracotta central. Point terracotta sous l'onglet actif.
6. **Mots du quotidien** : Suivi, Notes, Relances, Plus.
7. **Éco-conception** : polices système uniquement (0 Ko de webfont), aucune image décorative.

## Tokens (extrait)

| Rôle | Clair | Sombre |
| --- | --- | --- |
| `--color-page` | `#efe9dd` | `#141310` |
| `--color-bg` (cartes) | `#fbf8f2` | `#1d1b18` |
| `--color-text` / `--line` | `#1b1a17` | `#f2ede3` |
| `--color-text-muted` | `#5f5a50` | `#a7a196` |
| `--color-accent` (fonds) | `#a8401f` | `#b9502f` |
| `--color-accent-text` (texte) | `#a8401f` | `#ff9b78` |
| `--nav-bg` | `#1b1a17` | `#f2ede3` |

Source de vérité : `src/app/styles/global.css`.

## Contrastes vérifiés (WCAG AA ≥ 4.5:1)

| Paire | Clair | Sombre |
| --- | --- | --- |
| Texte / page | 14.4 | 15.9 |
| Secondaire / carte | 6.5 | 6.7 |
| Accent-texte / page | 5.1 | 9.0 |
| Blanc / accent | 6.1 | 4.9 |
| Libellé nav / capsule | 7.0 | 6.2 |
| Bouton principal (papier / encre) | 16.4 | 15.9 |

Règle : texte coloré → `--color-accent-text`, jamais `--color-accent` (réservé aux fonds).

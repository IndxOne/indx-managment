const PALETTE = [
  "phase-chip-blue",
  "phase-chip-purple",
  "phase-chip-orange",
  "phase-chip-green",
  "phase-chip-red",
  "phase-chip-teal",
  "phase-chip-pink",
  "phase-chip-gray",
] as const;

/**
 * Couleur de chip stable pour une phase donnée : même phase → même couleur
 * partout dans l'app (pas de choix manuel à maintenir par espace).
 */
export function phaseChipClass(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return PALETTE[hash % PALETTE.length] ?? PALETTE[0];
}

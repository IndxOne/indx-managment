const STORAGE_KEY = "indxone-projets:user-hash";

/**
 * Identifiant opaque persistant par navigateur, envoyé en en-tête
 * `x-user-hash` sur chaque requête Supabase. Même mécanisme que la table
 * sync_snapshots déjà en place dans ce projet (pas de compte, pas de mot
 * de passe) — voir la note de sécurité dans supabase-store.tsx.
 */
export function getOrCreateUserHash(): string {
  const existing = localStorage.getItem(STORAGE_KEY);
  if (existing) return existing;
  const generated = crypto.randomUUID();
  localStorage.setItem(STORAGE_KEY, generated);
  return generated;
}

/**
 * Bascule cet appareil vers un code existant (retrouver ses données depuis
 * un autre navigateur). Le client Supabase déjà instancié garde l'ancien
 * en-tête en mémoire : l'appelant doit recharger la page après ce changement.
 */
export function setUserHash(hash: string): void {
  localStorage.setItem(STORAGE_KEY, hash);
}

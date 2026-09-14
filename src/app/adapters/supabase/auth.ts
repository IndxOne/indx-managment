import { getSupabaseClient } from "./client";

/**
 * LOT 1A — Wrapper Supabase Auth OTP email.
 *
 * Isolé du mécanisme user_hash existant (voir user-hash.ts, jamais
 * modifié par ce lot) : ce module ne lit ni n'écrit jamais user_hash, et
 * user-hash.ts ne dépend jamais de ce module. L'identité authentifiée
 * (`authUserId`, = auth.uid() côté Postgres) et l'identité historique
 * (`userHash`) restent deux choses strictement distinctes tant que le lot
 * de rattachement (hors périmètre du Lot 1A) n'a pas eu lieu — aucune
 * requête vers les tables projets_* ne doit lire `authUserId` avant ça.
 *
 * Utilise le client Supabase existant (getSupabaseClient, client.ts) :
 * aucun nouveau client, aucune clé service_role, aucun appel réseau réel
 * dans les tests (mocks uniquement, cf. auth.test.ts).
 */

export interface AuthError {
  message: string;
}

function toAuthError(error: { message: string } | null): AuthError | null {
  return error ? { message: error.message } : null;
}

/**
 * Envoie un code OTP par email. `shouldCreateUser: false` (obligatoire,
 * décision produit) : aucune inscription libre, seuls des comptes créés
 * séparément (hors périmètre) peuvent recevoir un code. Le template email
 * Supabase Dashboard doit utiliser {{ .Token }} pour envoyer un code à
 * saisir plutôt qu'un lien magique — configuration Dashboard, hors dépôt.
 */
export async function sendOtp(email: string): Promise<{ error: AuthError | null }> {
  const client = getSupabaseClient();
  const { error } = await client.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: false },
  });
  return { error: toAuthError(error) };
}

/** Renvoie un nouveau code : strictement le même appel que l'envoi initial. */
export const resendOtp = sendOtp;

/** Vérifie le code OTP saisi et retourne l'identité authentifiée (authUserId), jamais userHash. */
export async function verifyOtp(
  email: string,
  token: string
): Promise<{ authUserId: string | null; error: AuthError | null }> {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.verifyOtp({ email, token, type: "email" });
  if (error) return { authUserId: null, error: toAuthError(error) };
  return { authUserId: data.user?.id ?? null, error: null };
}

/** Lecture de la session courante (au démarrage) — retourne null si aucune session active. */
export async function getCurrentAuthUserId(): Promise<string | null> {
  const client = getSupabaseClient();
  const { data } = await client.auth.getSession();
  return data.session?.user.id ?? null;
}

/**
 * Écoute les changements de session (connexion, déconnexion, rafraîchissement
 * de JWT). Retourne une fonction de désabonnement — à appeler impérativement
 * au démontage du composant appelant pour éviter toute fuite d'écouteur.
 */
export function onAuthStateChange(callback: (authUserId: string | null) => void): () => void {
  const client = getSupabaseClient();
  const {
    data: { subscription },
  } = client.auth.onAuthStateChange((_event, session) => {
    callback(session?.user.id ?? null);
  });
  return () => subscription.unsubscribe();
}

/**
 * Déconnexion locale uniquement (`scope: "local"`) : ferme la session sur
 * cet appareil sans invalider les autres sessions actives de ce compte —
 * comportement attendu pour un usage mono-appareil, contrairement au
 * défaut Supabase ("global", qui déconnecte partout).
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut({ scope: "local" });
  return { error: toAuthError(error) };
}

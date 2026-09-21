import { useEffect, useState } from "react";
import { getCurrentAuthUserId, onAuthStateChange } from "../adapters/supabase/auth";
import { isSupabaseConfigured } from "../adapters/supabase/client";

/**
 * Hotfix production (401 sur les lectures V3, cf. PROJECT_HANDOFF.md) : les
 * tables `projets_v3_*` sont RLS + `revoke all ... from anon` — toute
 * lecture V3 tentée sans session Supabase Auth valide échoue en 401. Ce hook
 * est le point central unique qui connaît l'état Auth courant ; chaque écran
 * V3 (HomeScreen, ProjectsV3ListScreen, BriefLauncherScreen, BriefScreen,
 * ProjectV3Screen) doit attendre `status === "authenticated"` avant de lancer
 * la moindre requête `projets_v3_*`, jamais répéter `getCurrentAuthUserId()`
 * localement.
 *
 * "unconfigured" (Supabase non configuré, ex. TemporaryStoreProvider en dev)
 * et "unauthenticated" (configuré, mais aucune session) sont deux états
 * distincts : seul le second doit proposer un CTA "Se connecter" — le
 * premier reste le comportement "Indisponible pour l'instant" déjà en place.
 */
export type AuthState =
  | { status: "unconfigured" }
  | { status: "loading" }
  | { status: "unauthenticated" }
  | { status: "authenticated"; authUserId: string };

type Listener = (state: AuthState) => void;

const UNCONFIGURED: AuthState = { status: "unconfigured" };
const LOADING: AuthState = { status: "loading" };
const UNAUTHENTICATED: AuthState = { status: "unauthenticated" };

let current: AuthState = LOADING;
let listeners = new Set<Listener>();
let started = false;
let unsubscribeSupabase: (() => void) | null = null;
/** Invalide une résolution `getCurrentAuthUserId()` d'une génération
 * précédente (ex. `resetAuthStateForTests()` entre deux tests) qui
 * répondrait en retard sur le singleton courant. */
let generation = 0;

function broadcast(next: AuthState) {
  current = next;
  for (const listener of listeners) listener(current);
}

function toAuthState(authUserId: string | null): AuthState {
  return authUserId ? { status: "authenticated", authUserId } : UNAUTHENTICATED;
}

/**
 * Un seul abonnement Supabase réel pour toute l'application, quel que soit
 * le nombre d'écrans montés simultanément (jamais un `onAuthStateChange()`
 * par écran — évite les listeners multiples évoqués dans la consigne).
 */
function ensureStarted() {
  if (started) return;
  started = true;
  if (!isSupabaseConfigured()) {
    broadcast(UNCONFIGURED);
    return;
  }
  const thisGeneration = generation;
  // `getCurrentAuthUserId()` (lecture ponctuelle) et `onAuthStateChange()`
  // (abonnement) démarrent en parallèle sans garantie d'ordre : un logout
  // rapide juste après le montage peut faire arriver l'événement AVANT que
  // la lecture initiale ne résolve. Sans ce garde-fou, la lecture initiale
  // écraserait alors l'état plus récent avec une session obsolète — trouvé
  // en review (PR #66), exactement le bug que ce hotfix corrige.
  let eventObserved = false;
  getCurrentAuthUserId().then((authUserId) => {
    if (thisGeneration !== generation || eventObserved) return;
    broadcast(toAuthState(authUserId));
  });
  unsubscribeSupabase = onAuthStateChange((authUserId) => {
    if (thisGeneration !== generation) return;
    eventObserved = true;
    broadcast(toAuthState(authUserId));
  });
}

export function useAuthState(): AuthState {
  const [state, setState] = useState<AuthState>(current);

  useEffect(() => {
    ensureStarted();
    listeners.add(setState);
    // Rattrape un changement survenu entre le rendu initial et cet effet.
    setState(current);
    return () => {
      listeners.delete(setState);
    };
  }, []);

  return state;
}

/**
 * Clé stable pour un tableau de dépendances de `useEffect` : `auth.status`
 * seul ne change pas quand l'utilisateur authentifié change directement
 * (compte A -> compte B, sans repasser par "loading"/"unauthenticated"),
 * ce qui laisserait les anciennes données affichées — trouvé en review (PR
 * #66). Inclut `authUserId` uniquement quand pertinent.
 */
export function authStateKey(auth: AuthState): string {
  return auth.status === "authenticated" ? `authenticated:${auth.authUserId}` : auth.status;
}

/** Tests uniquement — réinitialise le singleton entre les cas de test. */
export function resetAuthStateForTests(): void {
  unsubscribeSupabase?.();
  unsubscribeSupabase = null;
  started = false;
  current = LOADING;
  listeners = new Set();
  generation += 1;
}

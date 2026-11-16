import { useState } from "react";
import { signOut } from "../adapters/supabase/auth";
import { useAuthState } from "../hooks/useAuthState";

/** En-tête minimal : marque + connexion (visiteur) ou compte + déconnexion (utilisateur authentifié).
 * Réutilise useAuthState et l'adaptateur signOut existants ; « Compte » ouvre l'écran de connexion existant
 * (qui affiche « Connecté. » et « Se déconnecter »). Aucun mécanisme d'authentification parallèle. */
export function MinimalHeader({ onOpenAuth, onHome }: { onOpenAuth: () => void; onHome: () => void }) {
  const auth = useAuthState();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignOut() {
    if (busy) return;
    setBusy(true);
    setError(null);
    const { error: signOutError } = await signOut();
    setBusy(false);
    // Échec réel : aucun faux état déconnecté, la session reste telle que confirmée par useAuthState.
    if (signOutError) setError("Déconnexion impossible. Réessaie dans un instant.");
  }

  return (
    <header className="mini-header">
      <div className="mini-header-bar">
        <button type="button" className="mini-brand tap-target" onClick={onHome} aria-label="Management, retour à Mes projets">
          <img src="/brand/indxone-mark-tile.svg" alt="" width={32} height={32} />
          <span>Management</span>
        </button>
        <div className="mini-header-actions">
          {auth.status === "unauthenticated" && (
            <button type="button" className="btn btn-primary tap-target" onClick={onOpenAuth}>
              Se connecter
            </button>
          )}
          {auth.status === "authenticated" && (
            <>
              <button type="button" className="btn tap-target" onClick={onOpenAuth}>
                Compte
              </button>
              <button type="button" className="btn tap-target" disabled={busy} onClick={handleSignOut}>
                Se déconnecter
              </button>
            </>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="mini-error mini-header-error">
          {error}
        </p>
      )}
    </header>
  );
}

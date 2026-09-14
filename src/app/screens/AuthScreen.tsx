import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  getCurrentAuthUserId,
  onAuthStateChange,
  sendOtp,
  signOut as authSignOut,
  verifyOtp,
} from "../adapters/supabase/auth";

/**
 * Supabase applique par défaut un throttle de 60s entre deux demandes
 * d'OTP pour la même adresse : un cooldown UI plus court garantirait un
 * rate-limit côté serveur au premier clic disponible (retour revue PR
 * #47). Valeur centralisée ici, à ajuster si la configuration Supabase
 * Dashboard change ce throttle.
 */
const RESEND_COOLDOWN_SECONDS = 60;

/**
 * Message volontairement générique : ne jamais distinguer "email inconnu"
 * d'une autre cause d'échec (cf. shouldCreateUser:false + registre des
 * risques Lot 0, R6) — éviter qu'un tiers déduise de la réponse si une
 * adresse correspond à un compte existant.
 */
const GENERIC_ERROR = "Une erreur est survenue. Réessaie dans un instant.";

/**
 * Affiché après chaque envoi/renvoi, que l'adresse corresponde ou non à un
 * compte éligible : avec shouldCreateUser:false, Supabase distingue déjà
 * "compte existant" de "compte absent" par son résultat d'appel. Passer
 * systématiquement à l'étape OTP avec ce même message neutre (jamais de
 * branche visible différente selon le résultat, jamais d'erreur affichée
 * ici) empêche un observateur d'énumérer les comptes actifs depuis le
 * comportement de l'écran (retour revue PR #47, recoupe R6).
 */
const SEND_NOTICE = "Si cette adresse est autorisée, un code a été envoyé.";

type Step = "email" | "otp";

/**
 * LOT 1A — Écran Auth Supabase OTP, développé isolé et NON branché :
 * aucune route de App.tsx ne le rend accessible, aucun utilisateur ne
 * peut l'atteindre dans le build actuel (confirmé : la taille du bundle
 * de production est inchangée après l'ajout de ce fichier — il n'est
 * importé par aucun chemin atteignable). Reste ainsi tant que auth.uid()
 * n'est pas rattaché aux données et que les RLS sécurisées ne sont pas
 * actives (cf. docs/LOT0-REGISTRE-RISQUES.md, R6) : une connexion visible
 * avant cela créerait une fausse impression de sécurisation, le
 * mécanisme user_hash restant seul à piloter l'accès aux données.
 */
export function AuthScreen() {
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authUserId, setAuthUserId] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);
  const cooldownTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  /**
   * Dernier authUserId connu, mis à jour dans le listener lui-même (donc
   * toujours lu AVANT la nouvelle valeur). Sert uniquement à détecter une
   * transition connecté -> déconnecté survenue ailleurs (autre onglet,
   * expiration de session) : une session absente dès le départ (jamais
   * connecté) ne doit jamais réinitialiser une saisie OTP en cours
   * (retour revue PR #47).
   */
  const previousAuthUserId = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    getCurrentAuthUserId().then((id) => {
      if (active) {
        previousAuthUserId.current = id;
        setAuthUserId(id);
      }
    });
    const unsubscribe = onAuthStateChange((id) => {
      const wasAuthenticated = previousAuthUserId.current !== null;
      previousAuthUserId.current = id;
      setAuthUserId(id);
      if (wasAuthenticated && id === null) {
        setStep("email");
      }
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    };
  }, []);

  function startCooldown() {
    setCooldown(RESEND_COOLDOWN_SECONDS);
    if (cooldownTimer.current) clearInterval(cooldownTimer.current);
    cooldownTimer.current = setInterval(() => {
      setCooldown((current) => {
        if (current <= 1) {
          if (cooldownTimer.current) clearInterval(cooldownTimer.current);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
  }

  async function handleSendOtp(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    // Résultat d'appel volontairement ignoré ici : voir SEND_NOTICE.
    await sendOtp(email.trim());
    setSubmitting(false);
    setStep("otp");
    startCooldown();
  }

  async function handleVerifyOtp(event: FormEvent) {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const { authUserId: verifiedId, error: verifyError } = await verifyOtp(email.trim(), token.trim());
    setSubmitting(false);
    if (verifyError || !verifiedId) {
      setError(GENERIC_ERROR);
      return;
    }
    previousAuthUserId.current = verifiedId;
    setAuthUserId(verifiedId);
  }

  async function handleResend() {
    if (submitting || cooldown > 0) return;
    setSubmitting(true);
    setError(null);
    // Même choix qu'à l'envoi initial : résultat ignoré, voir SEND_NOTICE.
    await sendOtp(email.trim());
    setSubmitting(false);
    startCooldown();
  }

  function handleChangeEmail() {
    if (submitting) return;
    setStep("email");
    setToken("");
    setError(null);
  }

  async function handleSignOut() {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: signOutError } = await authSignOut();
    setSubmitting(false);
    if (signOutError) {
      // Échec réel (ex. hors-ligne) : ne jamais afficher un faux état
      // déconnecté tant que la session locale n'est pas confirmée retirée
      // (retour revue PR #47).
      setError(GENERIC_ERROR);
      return;
    }
    previousAuthUserId.current = null;
    setAuthUserId(null);
    setStep("email");
    setEmail("");
    setToken("");
    setError(null);
  }

  if (authUserId) {
    return (
      <div>
        <p>Connecté.</p>
        {error && (
          <p role="alert" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
        <button type="button" className="btn btn-block tap-target" disabled={submitting} onClick={handleSignOut}>
          Se déconnecter
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <form onSubmit={handleVerifyOtp}>
        <p className="action-sub">{SEND_NOTICE}</p>
        <div className="field">
          <label htmlFor="auth-otp-code">Code reçu par email</label>
          <input
            id="auth-otp-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            // eslint-disable-next-line jsx-a11y/no-autofocus -- étape atteinte après une action explicite (envoi du code), focus attendu sur le champ à saisir
            autoFocus
            value={token}
            onChange={(event) => {
              setToken(event.target.value);
              setError(null);
            }}
            aria-invalid={Boolean(error)}
          />
        </div>
        {error && (
          <p role="alert" style={{ color: "var(--color-danger)" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          className="btn btn-primary btn-block tap-target"
          disabled={submitting || token.trim().length === 0}
        >
          Vérifier
        </button>
        <button
          type="button"
          className="btn btn-block tap-target"
          disabled={submitting || cooldown > 0}
          onClick={handleResend}
        >
          {cooldown > 0 ? `Renvoyer le code (${cooldown}s)` : "Renvoyer le code"}
        </button>
        <button type="button" className="btn btn-block tap-target" disabled={submitting} onClick={handleChangeEmail}>
          Modifier l&apos;adresse
        </button>
      </form>
    );
  }

  return (
    <form onSubmit={handleSendOtp}>
      <div className="field">
        <label htmlFor="auth-email">Adresse email</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          // eslint-disable-next-line jsx-a11y/no-autofocus -- écran ouvert par une action explicite, focus attendu sur le premier champ
          autoFocus
          value={email}
          onChange={(event) => {
            setEmail(event.target.value);
            setError(null);
          }}
          aria-invalid={Boolean(error)}
        />
      </div>
      {error && (
        <p role="alert" style={{ color: "var(--color-danger)" }}>
          {error}
        </p>
      )}
      <button
        type="submit"
        className="btn btn-primary btn-block tap-target"
        disabled={submitting || email.trim().length === 0}
      >
        Envoyer le code
      </button>
    </form>
  );
}

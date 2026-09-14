import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  getCurrentAuthUserId,
  onAuthStateChange,
  sendOtp,
  signOut as authSignOut,
  verifyOtp,
} from "../adapters/supabase/auth";

const RESEND_COOLDOWN_SECONDS = 30;

/**
 * Message volontairement générique : ne jamais distinguer "email inconnu"
 * d'une autre cause d'échec (cf. shouldCreateUser:false + registre des
 * risques Lot 0, R6) — éviter qu'un tiers déduise de la réponse si une
 * adresse correspond à un compte existant.
 */
const GENERIC_ERROR = "Une erreur est survenue. Réessaie dans un instant.";

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

  useEffect(() => {
    let active = true;
    getCurrentAuthUserId().then((id) => {
      if (active) setAuthUserId(id);
    });
    const unsubscribe = onAuthStateChange((id) => setAuthUserId(id));
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
    const { error: sendError } = await sendOtp(email.trim());
    setSubmitting(false);
    if (sendError) {
      setError(GENERIC_ERROR);
      return;
    }
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
    setAuthUserId(verifiedId);
  }

  async function handleResend() {
    if (submitting || cooldown > 0) return;
    setSubmitting(true);
    setError(null);
    const { error: resendError } = await sendOtp(email.trim());
    setSubmitting(false);
    if (resendError) {
      setError(GENERIC_ERROR);
      return;
    }
    startCooldown();
  }

  async function handleSignOut() {
    if (submitting) return;
    setSubmitting(true);
    await authSignOut();
    setSubmitting(false);
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
        <button type="button" className="btn btn-block tap-target" disabled={submitting} onClick={handleSignOut}>
          Se déconnecter
        </button>
      </div>
    );
  }

  if (step === "otp") {
    return (
      <form onSubmit={handleVerifyOtp}>
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

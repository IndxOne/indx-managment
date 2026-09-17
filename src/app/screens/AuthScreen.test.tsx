import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthScreen } from "./AuthScreen";

/**
 * Tests UI de l'écran Auth OTP, routé depuis Réglages ("Connexion", cf.
 * App.tsx). Mock du module ../adapters/supabase/auth (jamais du client
 * Supabase brut) : ces tests vérifient le comportement de l'écran
 * lui-même, pas le wrapper (déjà couvert par auth.test.ts).
 */

const sendOtpMock = vi.fn();
const verifyOtpMock = vi.fn();
const getCurrentAuthUserIdMock = vi.fn();
const onAuthStateChangeMock = vi.fn();
const signOutMock = vi.fn();

vi.mock("../adapters/supabase/auth", () => ({
  sendOtp: (email: string) => sendOtpMock(email),
  verifyOtp: (email: string, token: string) => verifyOtpMock(email, token),
  getCurrentAuthUserId: () => getCurrentAuthUserIdMock(),
  onAuthStateChange: (callback: (id: string | null) => void) => onAuthStateChangeMock(callback),
  signOut: () => signOutMock(),
}));

beforeEach(() => {
  sendOtpMock.mockReset().mockResolvedValue({ error: null });
  verifyOtpMock.mockReset().mockResolvedValue({ authUserId: "auth-uid-1", error: null });
  getCurrentAuthUserIdMock.mockReset().mockResolvedValue(null);
  onAuthStateChangeMock.mockReset().mockReturnValue(() => {});
  signOutMock.mockReset().mockResolvedValue({ error: null });
});

describe("AuthScreen — étape email", () => {
  it("le bouton d'envoi est désactivé tant qu'aucun email n'est saisi", async () => {
    render(<AuthScreen />);

    expect(await screen.findByRole("button", { name: "Envoyer le code" })).toBeDisabled();
  });

  it("envoie le code (sendOtp) et passe à l'étape OTP au succès", async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.type(await screen.findByLabelText("Adresse email"), "agent@exemple.com");
    await user.click(screen.getByRole("button", { name: "Envoyer le code" }));

    expect(sendOtpMock).toHaveBeenCalledWith("agent@exemple.com");
    expect(await screen.findByLabelText("Code reçu par email")).toBeInTheDocument();
    expect(screen.getByText("Si cette adresse est autorisée, un code a été envoyé.")).toBeInTheDocument();
  });

  it("anti-double soumission : un clic pendant l'envoi ne déclenche pas un second appel", async () => {
    let resolveSend: (value: { error: null }) => void = () => {};
    sendOtpMock.mockReturnValue(new Promise((resolve) => (resolveSend = resolve)));
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.type(await screen.findByLabelText("Adresse email"), "agent@exemple.com");
    const button = screen.getByRole("button", { name: "Envoyer le code" });
    await user.click(button);

    expect(button).toBeDisabled();
    await user.click(button); // second clic pendant la requête en vol : ignoré

    expect(sendOtpMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveSend({ error: null });
    });
  });
});

/**
 * Fix 1 (revue PR #47, P2) : anti-énumération de compte. Avec
 * shouldCreateUser:false, un email sans compte éligible fait échouer
 * sendOtp côté Supabase alors qu'un compte existant réussit — l'écran ne
 * doit jamais distinguer les deux cas visuellement.
 */
describe("AuthScreen — anti-énumération (Fix 1)", () => {
  it("un échec d'envoi (ex. compte absent) mène exactement au même écran qu'un succès", async () => {
    sendOtpMock.mockResolvedValue({ error: { message: "user not found (détail interne)" } });
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.type(await screen.findByLabelText("Adresse email"), "inconnu@exemple.com");
    await user.click(screen.getByRole("button", { name: "Envoyer le code" }));

    // Même comportement visuel qu'un envoi réussi : étape OTP, message neutre, aucune erreur.
    expect(await screen.findByLabelText("Code reçu par email")).toBeInTheDocument();
    expect(screen.getByText("Si cette adresse est autorisée, un code a été envoyé.")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("un renvoi qui échoue produit aussi le même écran qu'un renvoi réussi", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ delay: null });
    render(<AuthScreen />);
    await user.type(await screen.findByLabelText("Adresse email"), "agent@exemple.com");
    await user.click(screen.getByRole("button", { name: "Envoyer le code" }));
    await screen.findByLabelText("Code reçu par email");

    sendOtpMock.mockResolvedValue({ error: { message: "détail interne" } });
    await act(async () => {
      vi.advanceTimersByTime(60_000); // fin du cooldown, bouton de renvoi réactivé
    });
    await user.click(screen.getByRole("button", { name: "Renvoyer le code" }));

    // Même comportement visuel qu'un renvoi réussi : toujours sur l'étape OTP, aucune erreur.
    expect(screen.getByLabelText("Code reçu par email")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});

describe("AuthScreen — étape OTP", () => {
  async function goToOtpStep() {
    const user = userEvent.setup();
    render(<AuthScreen />);
    await user.type(await screen.findByLabelText("Adresse email"), "agent@exemple.com");
    await user.click(screen.getByRole("button", { name: "Envoyer le code" }));
    await screen.findByLabelText("Code reçu par email");
    return user;
  }

  it("vérifie le code (verifyOtp) et affiche l'état connecté au succès", async () => {
    const user = await goToOtpStep();

    await user.type(screen.getByLabelText("Code reçu par email"), "123456");
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    expect(verifyOtpMock).toHaveBeenCalledWith("agent@exemple.com", "123456");
    expect(await screen.findByText("Connecté.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
  });

  it("code invalide : message générique, reste sur l'étape OTP", async () => {
    verifyOtpMock.mockResolvedValue({ authUserId: null, error: { message: "otp_expired" } });
    const user = await goToOtpStep();

    await user.type(screen.getByLabelText("Code reçu par email"), "000000");
    await user.click(screen.getByRole("button", { name: "Vérifier" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Une erreur est survenue. Réessaie dans un instant.");
    expect(screen.getByLabelText("Code reçu par email")).toBeInTheDocument();
  });

  it("renvoi avec délai : le bouton de renvoi est désactivé juste après l'envoi initial", async () => {
    await goToOtpStep();

    expect(screen.getByRole("button", { name: /Renvoyer le code \(\d+s\)/ })).toBeDisabled();
  });

  /** Fix 5 (revue PR #47, P2) : cooldown aligné sur le throttle Supabase par défaut (60s, pas 30s). */
  it("renvoi avec délai : reste désactivé à 59s, redevient actif à 60s pile, et rappelle sendOtp", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ delay: null });
    render(<AuthScreen />);
    await user.type(await screen.findByLabelText("Adresse email"), "agent@exemple.com");
    await user.click(screen.getByRole("button", { name: "Envoyer le code" }));
    await screen.findByLabelText("Code reçu par email");

    expect(sendOtpMock).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Renvoyer le code (60s)" })).toBeInTheDocument();

    await act(async () => {
      vi.advanceTimersByTime(59_000);
    });
    expect(screen.getByRole("button", { name: /Renvoyer le code \(\d+s\)/ })).toBeDisabled();

    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    const resendButton = screen.getByRole("button", { name: "Renvoyer le code" });
    expect(resendButton).not.toBeDisabled();

    await user.click(resendButton);
    expect(sendOtpMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  /** Fix 3 (revue PR #47, P2) : corriger un email mal saisi sans recharger l'écran. */
  it("« Modifier l'adresse » revient à l'étape email, vide le code et les erreurs, conserve l'email saisi", async () => {
    verifyOtpMock.mockResolvedValue({ authUserId: null, error: { message: "otp_expired" } });
    const user = await goToOtpStep();
    await user.type(screen.getByLabelText("Code reçu par email"), "000000");
    await user.click(screen.getByRole("button", { name: "Vérifier" }));
    await screen.findByRole("alert"); // une erreur est affichée avant de changer d'adresse

    await user.click(screen.getByRole("button", { name: "Modifier l'adresse" }));

    const emailInput = await screen.findByLabelText("Adresse email");
    expect(emailInput).toHaveValue("agent@exemple.com");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Code reçu par email")).not.toBeInTheDocument();
  });
});

describe("AuthScreen — session et déconnexion", () => {
  it("démarrage sans session : affiche l'étape email (aucun état connecté prématuré)", async () => {
    getCurrentAuthUserIdMock.mockResolvedValue(null);
    render(<AuthScreen />);

    expect(await screen.findByLabelText("Adresse email")).toBeInTheDocument();
    expect(screen.queryByText("Connecté.")).not.toBeInTheDocument();
  });

  /** Couvre aussi la restauration de session après reload : identique à la lecture au montage. */
  it("lecture de session au montage : si une session existe déjà, affiche directement l'état connecté", async () => {
    getCurrentAuthUserIdMock.mockResolvedValue("auth-uid-existant");
    render(<AuthScreen />);

    expect(await screen.findByText("Connecté.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Adresse email")).not.toBeInTheDocument();
  });

  it("écoute des changements Auth : le callback onAuthStateChange met à jour l'affichage", async () => {
    render(<AuthScreen />);
    await screen.findByLabelText("Adresse email");

    const handler = onAuthStateChangeMock.mock.calls[0]![0] as (id: string | null) => void;
    await act(async () => {
      handler("auth-uid-via-listener");
    });

    expect(await screen.findByText("Connecté.")).toBeInTheDocument();
  });

  /** Fix 2 (revue PR #47, P2) : ne jamais perturber une saisie OTP sans session préalable. */
  it("un événement de session null sans connexion préalable ne réinitialise pas une saisie OTP en cours", async () => {
    const user = userEvent.setup();
    render(<AuthScreen />);
    await user.type(await screen.findByLabelText("Adresse email"), "agent@exemple.com");
    await user.click(screen.getByRole("button", { name: "Envoyer le code" }));
    await user.type(await screen.findByLabelText("Code reçu par email"), "42");

    const handler = onAuthStateChangeMock.mock.calls[0]![0] as (id: string | null) => void;
    await act(async () => {
      handler(null); // ex. INITIAL_SESSION répété, jamais eu de session
    });

    expect(screen.getByLabelText("Code reçu par email")).toHaveValue("42");
  });

  /** Fix 2 (suite) : une vraie transition connecté -> déconnecté, elle, réinitialise bien l'étape. */
  it("une déconnexion externe après une session active réinitialise l'étape", async () => {
    render(<AuthScreen />);
    await screen.findByLabelText("Adresse email");

    const handler = onAuthStateChangeMock.mock.calls[0]![0] as (id: string | null) => void;
    await act(async () => {
      handler("auth-uid-via-listener");
    });
    expect(await screen.findByText("Connecté.")).toBeInTheDocument();

    await act(async () => {
      handler(null);
    });

    expect(await screen.findByLabelText("Adresse email")).toBeInTheDocument();
  });

  it("déconnexion : appelle signOut et revient à l'étape email", async () => {
    getCurrentAuthUserIdMock.mockResolvedValue("auth-uid-existant");
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(await screen.findByRole("button", { name: "Se déconnecter" }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText("Adresse email")).toBeInTheDocument();
  });

  /** Fix 4 (revue PR #47, P2) : ne jamais afficher un faux état déconnecté si signOut échoue. */
  it("déconnexion en échec : message générique, reste sur l'état connecté", async () => {
    getCurrentAuthUserIdMock.mockResolvedValue("auth-uid-existant");
    signOutMock.mockResolvedValue({ error: { message: "network error" } });
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(await screen.findByRole("button", { name: "Se déconnecter" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Une erreur est survenue. Réessaie dans un instant.");
    expect(screen.getByText("Connecté.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeInTheDocument();
  });
});

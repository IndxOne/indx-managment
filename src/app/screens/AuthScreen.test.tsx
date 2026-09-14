import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthScreen } from "./AuthScreen";

/**
 * Tests UI du Lot 1A — écran non branché (aucune route ne le rend
 * accessible, cf. AuthScreen.tsx). Mock du module ../adapters/supabase/auth
 * (jamais du client Supabase brut) : ces tests vérifient le comportement
 * de l'écran lui-même, pas le wrapper (déjà couvert par auth.test.ts).
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
  });

  it("affiche un message générique en cas d'échec, sans exposer le détail Supabase", async () => {
    sendOtpMock.mockResolvedValue({ error: { message: "user not found (détail interne)" } });
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.type(await screen.findByLabelText("Adresse email"), "agent@exemple.com");
    await user.click(screen.getByRole("button", { name: "Envoyer le code" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Une erreur est survenue. Réessaie dans un instant.");
    expect(alert).not.toHaveTextContent("user not found");
    expect(screen.queryByLabelText("Code reçu par email")).not.toBeInTheDocument();
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

  it("renvoi avec délai : redevient actif une fois le délai écoulé, et rappelle sendOtp", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ delay: null });
    render(<AuthScreen />);
    await user.type(await screen.findByLabelText("Adresse email"), "agent@exemple.com");
    await user.click(screen.getByRole("button", { name: "Envoyer le code" }));
    await screen.findByLabelText("Code reçu par email");

    expect(sendOtpMock).toHaveBeenCalledTimes(1);

    await act(async () => {
      vi.advanceTimersByTime(30_000);
    });

    const resendButton = screen.getByRole("button", { name: "Renvoyer le code" });
    expect(resendButton).not.toBeDisabled();

    await user.click(resendButton);
    expect(sendOtpMock).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });
});

describe("AuthScreen — session et déconnexion", () => {
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

  it("déconnexion : appelle signOut et revient à l'étape email", async () => {
    getCurrentAuthUserIdMock.mockResolvedValue("auth-uid-existant");
    const user = userEvent.setup();
    render(<AuthScreen />);

    await user.click(await screen.findByRole("button", { name: "Se déconnecter" }));

    expect(signOutMock).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText("Adresse email")).toBeInTheDocument();
  });
});

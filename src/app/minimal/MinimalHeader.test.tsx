import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({ auth: { status: "unauthenticated" } as { status: string; authUserId?: string }, signOut: vi.fn() }));
vi.mock("../hooks/useAuthState", () => ({ useAuthState: () => m.auth }));
vi.mock("../adapters/supabase/auth", () => ({ signOut: m.signOut }));

import { MinimalHeader } from "./MinimalHeader";

const setup = () => {
  const onOpenAuth = vi.fn();
  const onHome = vi.fn();
  render(<MinimalHeader onOpenAuth={onOpenAuth} onHome={onHome} />);
  return { onOpenAuth, onHome };
};

beforeEach(() => {
  vi.clearAllMocks();
  m.signOut.mockResolvedValue({ error: null });
});

describe("MinimalHeader", () => {
  it("visiteur : « Se connecter » ouvre la connexion existante, ni compte ni déconnexion", async () => {
    m.auth = { status: "unauthenticated" };
    const { onOpenAuth } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(onOpenAuth).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: "Compte" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Se déconnecter" })).not.toBeInTheDocument();
  });

  it("authentifié : « Compte » ouvre l'écran existant, « Se déconnecter » appelle signOut", async () => {
    m.auth = { status: "authenticated", authUserId: "u1" };
    const { onOpenAuth } = setup();
    expect(screen.queryByRole("button", { name: "Se connecter" })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Compte" }));
    expect(onOpenAuth).toHaveBeenCalledTimes(1);
    await userEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(m.signOut).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.queryByRole("alert")).not.toBeInTheDocument());
  });

  it("échec de déconnexion : alerte, jamais de faux état déconnecté", async () => {
    m.auth = { status: "authenticated", authUserId: "u1" };
    m.signOut.mockResolvedValue({ error: { message: "offline" } });
    setup();
    await userEvent.click(screen.getByRole("button", { name: "Se déconnecter" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Déconnexion impossible");
    expect(screen.getByRole("button", { name: "Se déconnecter" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Compte" })).toBeInTheDocument();
  });

  it("non configuré ou en chargement : aucun bouton d'authentification", () => {
    for (const status of ["unconfigured", "loading"]) {
      m.auth = { status };
      const { unmount } = render(<MinimalHeader onOpenAuth={vi.fn()} onHome={vi.fn()} />);
      expect(screen.queryByRole("button", { name: /connecter|Compte|déconnecter/i })).not.toBeInTheDocument();
      unmount();
    }
  });

  it("la marque ramène à Mes projets", async () => {
    const { onHome } = setup();
    await userEvent.click(screen.getByRole("button", { name: /retour à Mes projets/ }));
    expect(onHome).toHaveBeenCalled();
  });
});

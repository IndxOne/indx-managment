import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const m = vi.hoisted(() => ({
  auth: { status: "authenticated", authUserId: "u1" } as { status: string; authUserId?: string },
  read: vi.fn(),
  access: { canWrite: true, resolved: true, workspaceId: "ws1", authUserId: "u1" } as { canWrite: boolean; resolved: boolean; workspaceId?: string; authUserId?: string },
}));
vi.mock("../hooks/useAuthState", () => ({ useAuthState: () => m.auth, authStateKey: (a: { status: string; authUserId?: string }) => `${a.status}:${a.authUserId ?? ""}` }));
vi.mock("../adapters/supabase/client", () => ({ getSupabaseClient: () => ({}) }));
vi.mock("./read-minimal-projects", () => ({ readMinimalProjects: m.read }));
vi.mock("../v3-writes/useWriteAccess", () => ({ useCreateProjectAccess: () => m.access }));

import { MinimalProjectsScreen } from "./MinimalProjectsScreen";

const card = { id: "p1", name: "Site vitrine", status: "on_track", objective: "Publier", nextAction: { title: "Revoir" }, projectManager: "Alex", updatedAt: "2026-11-01T00:00:00.000Z" };
const renderScreen = (o: { onOpenProject?: () => void; onOpenAuth?: () => void } = {}) =>
  render(<MinimalProjectsScreen workspaceIds={["ws1"]} onOpenProject={o.onOpenProject ?? vi.fn()} onOpenAuth={o.onOpenAuth ?? vi.fn()} />);

beforeEach(() => {
  vi.clearAllMocks();
  m.auth = { status: "authenticated", authUserId: "u1" };
  m.access = { canWrite: true, resolved: true, workspaceId: "ws1", authUserId: "u1" };
});

describe("MinimalProjectsScreen", () => {
  it("déconnecté : titre, un seul CTA de connexion, aucune lecture", async () => {
    m.auth = { status: "unauthenticated" };
    const onOpenAuth = vi.fn();
    renderScreen({ onOpenAuth });
    expect(await screen.findByRole("heading", { level: 1, name: "Mes projets" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /Se connecter/ })).toHaveLength(1);
    await userEvent.click(screen.getByRole("button", { name: /Se connecter/ }));
    expect(onOpenAuth).toHaveBeenCalled();
    expect(m.read).not.toHaveBeenCalled();
  });
  it("non configuré : « Indisponible », sans faux contenu", async () => {
    m.auth = { status: "unconfigured" };
    renderScreen();
    expect(await screen.findByText(/Indisponible/)).toBeInTheDocument();
    expect(m.read).not.toHaveBeenCalled();
  });
  it("erreur réelle affichée avec relance, jamais de liste factice", async () => {
    m.read.mockResolvedValueOnce({ ok: false, error: { kind: "persistence", code: "unknown", message: "x" } }).mockResolvedValueOnce({ ok: true, value: [card] });
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    renderScreen();
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Réessayer/ }));
    expect(await screen.findByText("Site vitrine")).toBeInTheDocument();
  });
  it("liste : cartes réelles, ouverture du projet, création proposée à un éditeur", async () => {
    m.read.mockResolvedValue({ ok: true, value: [card] });
    const onOpenProject = vi.fn();
    renderScreen({ onOpenProject });
    await userEvent.click(await screen.findByRole("button", { name: /Site vitrine/ }));
    expect(onOpenProject).toHaveBeenCalledWith("p1");
    expect(screen.getByRole("button", { name: "+ Créer un projet" })).toBeInTheDocument();
  });
  it("aucun projet + droits : invitation à créer, dialogue ouvrable", async () => {
    m.read.mockResolvedValue({ ok: true, value: [] });
    renderScreen();
    expect(await screen.findByText("Aucun projet")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "+ Créer un projet" }));
    expect(screen.getByRole("dialog", { name: "Nouveau projet" })).toBeInTheDocument();
  });
  it("aucun projet sans droit d'écriture : pas de bouton de création", async () => {
    m.access = { canWrite: false, resolved: true };
    m.read.mockResolvedValue({ ok: true, value: [] });
    renderScreen();
    await waitFor(() => expect(screen.getByText("Vous n'avez pas encore de projet.")).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Créer un projet/ })).not.toBeInTheDocument();
  });
});

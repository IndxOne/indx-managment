import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Workspace } from "../../domain/workspace";
import { BottomNav } from "./BottomNav";

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "w1",
    name: "Support quotidien",
    kind: "run",
    approach: "it_ops",
    collaborationMode: "solo",
    presetVersion: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function stubDesktop() {
  const matchMedia = vi.fn().mockReturnValue({
    matches: true,
    addEventListener: () => {},
    removeEventListener: () => {},
  });
  vi.stubGlobal("matchMedia", matchMedia);
}

function renderNav(overrides: Partial<Parameters<typeof BottomNav>[0]> = {}) {
  return render(
    <BottomNav active="today" onChange={() => {}} onQuickCreate={() => {}} workspaces={[]} onSelectWorkspace={() => {}} {...overrides} />
  );
}

describe("BottomNav", () => {
  it("affiche les 5 emplacements primaires mobiles — Accueil/RUN/création rapide/Projets/Réglages (cadrage renouveau mobile Lot A)", () => {
    // jsdom sans matchMedia stubbé = mobile (cf. useIsDesktop).
    renderNav();
    expect(screen.getByRole("button", { name: /Accueil/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^RUN/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Créer une action" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Projets/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Réglages/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cette semaine/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rappels/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Plus$/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("le bouton central de création rapide appelle onQuickCreate, jamais onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onQuickCreate = vi.fn();
    renderNav({ onChange, onQuickCreate });

    await user.click(screen.getByRole("button", { name: "Créer une action" }));
    expect(onQuickCreate).toHaveBeenCalledTimes(1);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("conserve Cette semaine/Rappels/Plus en accès direct dans la sidebar desktop (aucune destination perdue)", () => {
    stubDesktop();
    renderNav();
    expect(screen.getByRole("button", { name: /Cette semaine/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rappels/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plus/ })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("marque l'onglet actif avec aria-current", () => {
    renderNav({ active: "spaces" });
    expect(screen.getByRole("button", { name: /Projets/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /Accueil/ })).not.toHaveAttribute("aria-current");
  });

  it("marque RUN actif quand la route courante est run", () => {
    renderNav({ active: "run" });
    expect(screen.getByRole("button", { name: /^RUN/ })).toHaveAttribute("aria-current", "page");
  });

  it("marque Réglages actif quand la route courante est app-settings (onglet primaire settings)", () => {
    renderNav({ active: "settings" });
    expect(screen.getByRole("button", { name: /Réglages/ })).toHaveAttribute("aria-current", "page");
  });

  it("chaque cible tactile respecte le minimum 44px (classe tap-target)", () => {
    renderNav();
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveClass("tap-target");
    }
  });

  it("appelle onChange au clic et au clavier (Entrée)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderNav({ onChange });

    await user.click(screen.getByRole("button", { name: /Projets/ }));
    expect(onChange).toHaveBeenCalledWith("spaces");

    screen.getByRole("button", { name: /^RUN/ }).focus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("run");
  });

  it("desktop : le bouton Plus de la sidebar appelle onChange au clic et au clavier", async () => {
    stubDesktop();
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderNav({ onChange });

    screen.getByRole("button", { name: /Plus/ }).focus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("more");

    vi.unstubAllGlobals();
  });

  it("desktop : le bouton dédié 'Nouvelle action' de la sidebar appelle onQuickCreate", async () => {
    stubDesktop();
    const user = userEvent.setup();
    const onQuickCreate = vi.fn();
    renderNav({ onQuickCreate });

    await user.click(screen.getByRole("button", { name: "Nouvelle action" }));
    expect(onQuickCreate).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it("liste les espaces RUN dans la barre latérale et marque l'espace actif", async () => {
    // La liste n'est rendue qu'à partir de 1024px (useIsDesktop) : simule le
    // passage en desktop, sinon jsdom (sans matchMedia) reste en mobile.
    stubDesktop();

    const user = userEvent.setup();
    const onSelectWorkspace = vi.fn();
    const ws1 = workspace({ id: "w1", name: "Support quotidien" });
    const ws2 = workspace({ id: "w2", name: "Autre RUN", kind: "run" });

    renderNav({
      active: "spaces",
      workspaces: [ws1, ws2],
      activeWorkspaceId: "w2",
      onSelectWorkspace,
    });

    expect(screen.getByRole("button", { name: /Support quotidien/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: /Autre RUN/ })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: /Support quotidien/ }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("w1");

    vi.unstubAllGlobals();
  });

  /**
   * UX-3 (correction de review, PR #65) : Projets = Project V3 uniquement,
   * Workspace V2 `kind=project` = legacy séparé et discret. La sidebar
   * primaire desktop ne doit donc jamais afficher ni permettre de créer un
   * Workspace V2 `kind=project` — seul « Anciens espaces projet »
   * (ProjectsV3ListScreen) y mène encore.
   */
  it("un Workspace V2 kind=project n'apparaît jamais dans la sidebar primaire desktop, et aucun CTA primaire n'en crée un", () => {
    stubDesktop();
    const runWorkspace = workspace({ id: "w1", name: "Support quotidien", kind: "run" });
    const legacyProject = workspace({ id: "w2", name: "Refonte CRM", kind: "project", approach: "project_amoa" });

    renderNav({ workspaces: [runWorkspace, legacyProject] });

    expect(screen.getByRole("button", { name: /Support quotidien/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Refonte CRM/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nouveau projet/ })).not.toBeInTheDocument();

    vi.unstubAllGlobals();
  });
});

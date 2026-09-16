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

describe("BottomNav", () => {
  it("affiche exactement les 3 destinations mobiles du prototype (Aujourd'hui, RUN, Projets — réalignement v2.2)", () => {
    // jsdom sans matchMedia stubbé = mobile (cf. useIsDesktop).
    render(
      <BottomNav
        active="today"
        onChange={() => {}}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /Aujourd'hui/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^RUN$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Projets/ })).toBeInTheDocument();
    // Plus de bouton central de création, plus de Réglages primaire (retour
    // au menu secondaire, cf. more-links.ts) : plus dans cette barre.
    expect(screen.queryByRole("button", { name: "Créer une action ou un projet" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Réglages/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Cette semaine/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rappels/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Plus$/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(3);
  });

  it("conserve les 3 mêmes destinations côté desktop, plus Plus (accès Semaine/Rappels/Réglages/Carnet/Hub/Approches/Recherche) et 'Nouvelle tâche' épinglée", () => {
    stubDesktop();
    render(
      <BottomNav
        active="today"
        onChange={() => {}}
        onQuickAdd={() => {}}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /Aujourd'hui/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^RUN$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Projets/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plus/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nouvelle tâche" })).toBeInTheDocument();
    // Cette semaine/Rappels/Réglages ne sont plus des onglets primaires desktop
    // non plus (réalignement exact sur le prototype) : plus dans cette barre.
    expect(screen.queryByRole("button", { name: /Cette semaine/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rappels/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Réglages/ })).not.toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("desktop : le bouton 'Nouvelle tâche' épinglé appelle onQuickAdd", async () => {
    stubDesktop();
    const user = userEvent.setup();
    const onQuickAdd = vi.fn();
    render(
      <BottomNav
        active="today"
        onChange={() => {}}
        onQuickAdd={onQuickAdd}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={() => {}}
      />
    );
    await user.click(screen.getByRole("button", { name: "Nouvelle tâche" }));
    expect(onQuickAdd).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("mobile : n'affiche aucun bouton de création rapide (déplacé dans l'en-tête 'Aujourd'hui', cf. HomeScreen)", () => {
    render(
      <BottomNav
        active="today"
        onChange={() => {}}
        onQuickAdd={() => {}}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={() => {}}
      />
    );
    expect(screen.queryByRole("button", { name: /Nouvelle tâche/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Créer/ })).not.toBeInTheDocument();
  });

  it("marque l'onglet actif avec aria-current", () => {
    render(
      <BottomNav
        active="spaces"
        onChange={() => {}}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /Projets/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /Aujourd'hui/ })).not.toHaveAttribute("aria-current");
  });

  it("marque RUN actif quand la route courante est run", () => {
    render(
      <BottomNav
        active="run"
        onChange={() => {}}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /^RUN$/ })).toHaveAttribute("aria-current", "page");
  });

  it("marque Plus actif sur desktop quand la route courante mappe sur 'more' (ex. Réglages)", () => {
    stubDesktop();
    render(
      <BottomNav
        active="more"
        onChange={() => {}}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /^Plus$/ })).toHaveAttribute("aria-current", "page");
    vi.unstubAllGlobals();
  });

  it("chaque cible tactile respecte le minimum 44px (classe tap-target)", () => {
    render(
      <BottomNav
        active="today"
        onChange={() => {}}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={() => {}}
      />
    );
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveClass("tap-target");
    }
  });

  it("appelle onChange au clic et au clavier (Entrée)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BottomNav
        active="today"
        onChange={onChange}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={() => {}}
      />
    );

    await user.click(screen.getByRole("button", { name: /^RUN$/ }));
    expect(onChange).toHaveBeenCalledWith("run");

    screen.getByRole("button", { name: /Projets/ }).focus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("spaces");
  });

  it("desktop : le bouton Plus de la sidebar appelle onChange au clic et au clavier", async () => {
    stubDesktop();
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <BottomNav
        active="today"
        onChange={onChange}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={() => {}}
      />
    );

    screen.getByRole("button", { name: /Plus/ }).focus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("more");

    vi.unstubAllGlobals();
  });

  it("liste les espaces dans la barre latérale, marque l'espace actif et permet d'en créer un", async () => {
    // La liste n'est rendue qu'à partir de 1024px (useIsDesktop) : simule le
    // passage en desktop, sinon jsdom (sans matchMedia) reste en mobile.
    stubDesktop();

    const user = userEvent.setup();
    const onSelectWorkspace = vi.fn();
    const onCreateWorkspace = vi.fn();
    const ws1 = workspace({ id: "w1", name: "Support quotidien" });
    const ws2 = workspace({ id: "w2", name: "Refonte CRM", kind: "project", approach: "project_amoa" });

    render(
      <BottomNav
        active="spaces"
        onChange={() => {}}
        workspaces={[ws1, ws2]}
        activeWorkspaceId="w2"
        onSelectWorkspace={onSelectWorkspace}
        onCreateWorkspace={onCreateWorkspace}
      />
    );

    expect(screen.getByRole("button", { name: /Support quotidien/ })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("button", { name: /Refonte CRM/ })).toHaveAttribute("aria-current", "page");

    await user.click(screen.getByRole("button", { name: /Support quotidien/ }));
    expect(onSelectWorkspace).toHaveBeenCalledWith("w1");

    await user.click(screen.getByRole("button", { name: /Nouveau projet/ }));
    expect(onCreateWorkspace).toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});

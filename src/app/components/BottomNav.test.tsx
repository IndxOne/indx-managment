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
  it("affiche exactement les 5 destinations mobiles (Aujourd'hui, RUN, création rapide, Projets, Réglages — renouveau produit v2.2)", () => {
    // jsdom sans matchMedia stubbé = mobile (cf. useIsDesktop).
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
    expect(screen.getByRole("button", { name: "Créer une action ou un projet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Projets/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Réglages/ })).toBeInTheDocument();
    // Cette semaine / Rappels / Plus ne sont plus des destinations mobiles primaires
    // (elles rejoignent le menu secondaire, cf. more-links.ts) : plus dans cette barre.
    expect(screen.queryByRole("button", { name: /Cette semaine/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Rappels/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Plus$/ })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button")).toHaveLength(5);
  });

  it("conserve un accès complet (Aujourd'hui/RUN/Projets/Semaine/Rappels/Réglages/Plus) dans la sidebar desktop", () => {
    stubDesktop();
    render(
      <BottomNav
        active="today"
        onChange={() => {}}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /Accueil/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^RUN$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Projets/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Cette semaine/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Rappels/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Réglages/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plus/ })).toBeInTheDocument();
    vi.unstubAllGlobals();
  });

  it("n'affiche aucun bouton central de création rapide sur desktop (remplacé par 'Nouvelle action' dans la sidebar)", () => {
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
    expect(screen.queryByRole("button", { name: "Créer une action ou un projet" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nouvelle action" })).toBeInTheDocument();
    vi.unstubAllGlobals();
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

  it("marque Rappels actif sur desktop quand la route courante est reminders", () => {
    stubDesktop();
    render(
      <BottomNav
        active="reminders"
        onChange={() => {}}
        workspaces={[]}
        onSelectWorkspace={() => {}}
        onCreateWorkspace={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /Rappels/ })).toHaveAttribute("aria-current", "page");
    vi.unstubAllGlobals();
  });

  it("chaque cible tactile respecte le minimum 44px (classe tap-target)", () => {
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

    screen.getByRole("button", { name: /Réglages/ }).focus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("settings");
  });

  it("le bouton central appelle onQuickAdd (création rapide, v2.2 §5)", async () => {
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
    await user.click(screen.getByRole("button", { name: "Créer une action ou un projet" }));
    expect(onQuickAdd).toHaveBeenCalledTimes(1);
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

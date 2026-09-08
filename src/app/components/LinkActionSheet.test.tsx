import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { LinkActionSheet } from "./LinkActionSheet";

function makeWorkspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: overrides.id ?? "w1",
    name: overrides.name ?? "Support quotidien",
    kind: overrides.kind ?? "run",
    approach: "simple",
    collaborationMode: "solo",
    presetVersion: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    id: overrides.id ?? "a1",
    workspaceId: overrides.workspaceId ?? "w1",
    title: overrides.title ?? "Configurer VPN",
    status: "todo",
    priority: "normal",
    itemType: "task",
    assigneeIds: [],
    tags: [],
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("LinkActionSheet — sans lien existant", () => {
  it("liste les actions candidates des autres workspaces, exclut l'action courante", () => {
    const current = makeAction({ id: "a1", workspaceId: "w1" });
    const other = makeAction({ id: "a2", title: "Migrer serveur ERP", workspaceId: "w2" });
    const workspaces = [makeWorkspace({ id: "w1", kind: "run" }), makeWorkspace({ id: "w2", kind: "project", name: "Migration ERP" })];
    const actionsByWorkspace = { w1: [current], w2: [other] };

    render(
      <LinkActionSheet
        action={current}
        workspaces={workspaces}
        actionsByWorkspace={actionsByWorkspace}
        onClose={vi.fn()}
        onLink={vi.fn()}
        onUnlink={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText(/Migrer serveur ERP/)).toBeInTheDocument();
    expect(screen.queryByText(/Configurer VPN — /)).not.toBeInTheDocument();
  });

  it("filtre les candidats par le texte recherché", async () => {
    const user = userEvent.setup();
    const current = makeAction({ id: "a1" });
    const candidateA = makeAction({ id: "a2", title: "Migrer serveur ERP" });
    const candidateB = makeAction({ id: "a3", title: "Renouveler certificat SSL" });
    const workspace = makeWorkspace();

    render(
      <LinkActionSheet
        action={current}
        workspaces={[workspace]}
        actionsByWorkspace={{ w1: [current, candidateA, candidateB] }}
        onClose={vi.fn()}
        onLink={vi.fn()}
        onUnlink={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    await user.type(screen.getByLabelText("Rechercher une action"), "ssl");
    expect(screen.getByText(/Renouveler certificat SSL/)).toBeInTheDocument();
    expect(screen.queryByText(/Migrer serveur ERP/)).not.toBeInTheDocument();
  });

  it("déclenche onLink au clic sur un candidat", async () => {
    const user = userEvent.setup();
    const onLink = vi.fn();
    const current = makeAction({ id: "a1" });
    const candidate = makeAction({ id: "a2", title: "Migrer serveur ERP" });
    const workspace = makeWorkspace();

    render(
      <LinkActionSheet
        action={current}
        workspaces={[workspace]}
        actionsByWorkspace={{ w1: [current, candidate] }}
        onClose={vi.fn()}
        onLink={onLink}
        onUnlink={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Migrer serveur ERP/ }));
    expect(onLink).toHaveBeenCalledWith("a2");
  });
});

describe("LinkActionSheet — lien existant", () => {
  it("affiche l'action liée et son espace, propose de naviguer et de délier", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    const onClose = vi.fn();
    const current = makeAction({ id: "a1", linkedActionId: "a2" });
    const linked = makeAction({ id: "a2", title: "Migrer serveur ERP", workspaceId: "w2" });
    const workspaces = [makeWorkspace({ id: "w1" }), makeWorkspace({ id: "w2", kind: "project", name: "Migration ERP" })];

    render(
      <LinkActionSheet
        action={current}
        workspaces={workspaces}
        actionsByWorkspace={{ w1: [current], w2: [linked] }}
        onClose={onClose}
        onLink={vi.fn()}
        onUnlink={vi.fn()}
        onNavigate={onNavigate}
      />
    );

    expect(screen.getByText("Migrer serveur ERP")).toBeInTheDocument();
    expect(screen.getByText(/Migration ERP/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Voir l'espace" }));
    expect(onNavigate).toHaveBeenCalledWith("w2");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("déclenche onUnlink au clic sur Délier", async () => {
    const user = userEvent.setup();
    const onUnlink = vi.fn();
    const current = makeAction({ id: "a1", linkedActionId: "a2" });
    const linked = makeAction({ id: "a2", title: "Migrer serveur ERP" });
    const workspace = makeWorkspace();

    render(
      <LinkActionSheet
        action={current}
        workspaces={[workspace]}
        actionsByWorkspace={{ w1: [current, linked] }}
        onClose={vi.fn()}
        onLink={vi.fn()}
        onUnlink={onUnlink}
        onNavigate={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Délier" }));
    expect(onUnlink).toHaveBeenCalledTimes(1);
  });

  it("signale une action liée introuvable (supprimée)", () => {
    const current = makeAction({ id: "a1", linkedActionId: "gone" });
    const workspace = makeWorkspace();

    render(
      <LinkActionSheet
        action={current}
        workspaces={[workspace]}
        actionsByWorkspace={{ w1: [current] }}
        onClose={vi.fn()}
        onLink={vi.fn()}
        onUnlink={vi.fn()}
        onNavigate={vi.fn()}
      />
    );

    expect(screen.getByText("Action liée introuvable (supprimée).")).toBeInTheDocument();
  });
});

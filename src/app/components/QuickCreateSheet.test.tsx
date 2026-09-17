import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Workspace } from "../../domain/workspace";
import { QuickCreateSheet } from "./QuickCreateSheet";

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "w1",
    name: "RUN quotidien",
    kind: "run",
    approach: "it_ops",
    collaborationMode: "solo",
    presetVersion: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("QuickCreateSheet — « Que voulez-vous créer ? » (Lot B)", () => {
  it("branche Action RUN : un seul espace RUN saute directement au formulaire et cible cet espace", async () => {
    const user = userEvent.setup();
    const run = workspace({ id: "run-1", name: "RUN quotidien", kind: "run" });
    const onCreateAction = vi.fn();
    render(
      <QuickCreateSheet
        workspaces={[run]}
        membersByWorkspace={{}}
        onCancel={vi.fn()}
        onCreateAction={onCreateAction}
        onCreateProject={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Action RUN/ }));
    await user.type(screen.getByLabelText("Titre"), "Investiguer l'incident");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    expect(onCreateAction).toHaveBeenCalledWith(run, expect.objectContaining({ title: "Investiguer l'incident" }));
  });

  it("branche Tâche Projet : fait choisir le projet cible parmi les espaces PROJET puis crée dedans", async () => {
    const user = userEvent.setup();
    const projectA = workspace({ id: "proj-a", name: "Refonte site", kind: "project" });
    const projectB = workspace({ id: "proj-b", name: "Migration ERP", kind: "project" });
    const onCreateAction = vi.fn();
    render(
      <QuickCreateSheet
        workspaces={[projectA, projectB]}
        membersByWorkspace={{}}
        onCancel={vi.fn()}
        onCreateAction={onCreateAction}
        onCreateProject={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Tâche Projet/ }));
    // Plusieurs projets existent : l'étape de sélection du projet cible s'affiche.
    await user.click(screen.getByRole("button", { name: "Migration ERP" }));
    await user.type(screen.getByLabelText("Titre"), "Cadrer la reprise de données");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    expect(onCreateAction).toHaveBeenCalledWith(projectB, expect.objectContaining({ title: "Cadrer la reprise de données" }));
  });

  it("« Nouveau projet » navigue vers la création d'espace sans engager de second moteur de création", async () => {
    const user = userEvent.setup();
    const onCreateProject = vi.fn();
    render(
      <QuickCreateSheet
        workspaces={[workspace()]}
        membersByWorkspace={{}}
        onCancel={vi.fn()}
        onCreateAction={vi.fn()}
        onCreateProject={onCreateProject}
      />
    );

    await user.click(screen.getByRole("button", { name: /Nouveau projet/ }));
    expect(onCreateProject).toHaveBeenCalledTimes(1);
  });

  it("ne propose pas Tâche Projet quand aucun espace PROJET n'existe", () => {
    render(
      <QuickCreateSheet
        workspaces={[workspace({ kind: "run" })]}
        membersByWorkspace={{}}
        onCancel={vi.fn()}
        onCreateAction={vi.fn()}
        onCreateProject={vi.fn()}
      />
    );
    expect(screen.queryByRole("button", { name: /Tâche Projet/ })).not.toBeInTheDocument();
  });
});

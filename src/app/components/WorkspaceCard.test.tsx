import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { WorkspaceCard } from "./WorkspaceCard";

function workspace(overrides: Partial<Workspace> = {}): Workspace {
  return {
    id: "w1",
    name: "Refonte site client",
    kind: "project",
    approach: "project_amoa",
    collaborationMode: "solo",
    presetVersion: 1,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Tâche",
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

describe("WorkspaceCard — liste des projets (Lot B)", () => {
  it("affiche nom, statut dérivé « Nouveau » et aucune priorité quand l'espace n'a aucune action", () => {
    render(<WorkspaceCard workspace={workspace()} actions={[]} timezone="Europe/Paris" onSelect={vi.fn()} />);
    expect(screen.getByText("Refonte site client")).toBeInTheDocument();
    expect(screen.getByText("Nouveau")).toBeInTheDocument();
    expect(screen.queryByText("Haute")).not.toBeInTheDocument();
  });

  it("affiche « Actif », la priorité dominante des actions ouvertes, la progression et le nombre d'actions ouvertes", () => {
    const actions = [
      action({ id: "a1", priority: "high", status: "todo" }),
      action({ id: "a2", priority: "low", status: "done" }),
    ];
    render(<WorkspaceCard workspace={workspace()} actions={actions} timezone="Europe/Paris" onSelect={vi.fn()} />);

    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByText("Haute")).toBeInTheDocument();
    // 1 action terminée sur 2 -> 50%.
    expect(screen.getByText("50%")).toBeInTheDocument();
    expect(screen.getByText(/1 action ouverte/)).toBeInTheDocument();
  });

  it("affiche « Terminé » quand toutes les actions existantes sont faites (aucune priorité à afficher)", () => {
    const actions = [action({ id: "a1", status: "done", priority: "high" })];
    render(<WorkspaceCard workspace={workspace()} actions={actions} timezone="Europe/Paris" onSelect={vi.fn()} />);

    expect(screen.getByText("Terminé")).toBeInTheDocument();
    expect(screen.queryByText("Haute")).not.toBeInTheDocument();
  });
});

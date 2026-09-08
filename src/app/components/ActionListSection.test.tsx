import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { ActionListSection } from "./ActionListSection";

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    id: overrides.id ?? "a1",
    workspaceId: "w1",
    title: overrides.title ?? "Action",
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

const noop = {
  onMove: vi.fn(),
  onCycleStatus: vi.fn(),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onDisableReminder: vi.fn(),
  onOpenNotes: vi.fn(),
};

describe("ActionListSection — masquer les actions terminées", () => {
  it("n'affiche pas le bouton de masquage sans action terminée", () => {
    render(
      <ActionListSection
        id="section-test"
        title="Livrables"
        actions={[makeAction({ id: "a1", title: "En cours", status: "doing" })]}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        {...noop}
      />
    );
    expect(screen.queryByRole("button", { name: /terminées/ })).not.toBeInTheDocument();
  });

  it("masque puis réaffiche les actions terminées, avec le compteur exact", async () => {
    const user = userEvent.setup();
    render(
      <ActionListSection
        id="section-test"
        title="Livrables"
        actions={[
          makeAction({ id: "a1", title: "À faire", status: "todo" }),
          makeAction({ id: "a2", title: "Fait 1", status: "done" }),
          makeAction({ id: "a3", title: "Fait 2", status: "done" }),
        ]}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        {...noop}
      />
    );

    expect(screen.getByText("Fait 1")).toBeInTheDocument();
    expect(screen.getByText("Fait 2")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Masquer terminées (2)" }));

    expect(screen.queryByText("Fait 1")).not.toBeInTheDocument();
    expect(screen.queryByText("Fait 2")).not.toBeInTheDocument();
    expect(screen.getByText("À faire")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Afficher terminées (2)" }));
    expect(screen.getByText("Fait 1")).toBeInTheDocument();
  });

  it("n'affiche rien si la section est vide et sans message dédié", () => {
    const { container } = render(
      <ActionListSection
        id="section-test"
        title="Jalons"
        actions={[]}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        {...noop}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("affiche le message dédié si la section est vide et emptyMessage est fourni", () => {
    render(
      <ActionListSection
        id="section-test"
        title="Aujourd'hui"
        actions={[]}
        timezone="Europe/Paris"
        statusLabels={STATUS_LABELS_DEFAULT}
        emptyMessage="Aucune action planifiée."
        {...noop}
      />
    );
    expect(screen.getByText("Aucune action planifiée.")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action, ActionStatus } from "../../domain/types";
import { MoveActionSheet } from "./MoveActionSheet";

const STATUS_LABELS: Record<ActionStatus, string> = {
  todo: "À faire",
  doing: "En cours",
  waiting: "En attente",
  done: "Terminé",
};

function makeAction(overrides: Partial<Action> = {}): Action {
  return {
    id: overrides.id ?? "a1",
    workspaceId: overrides.workspaceId ?? "w1",
    title: overrides.title ?? "Relancer le prestataire",
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

describe("MoveActionSheet — axe Statut", () => {
  it("confirme directement un statut hors 'En attente'", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <MoveActionSheet
        action={makeAction()}
        phaseOptions={[]}
        statusLabels={STATUS_LABELS}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Statut/ }));
    await user.click(screen.getByRole("button", { name: "Terminé" }));

    expect(onConfirm).toHaveBeenCalledWith({ axis: "status", status: "done" });
  });

  it("passage en 'En attente' ouvre l'étape relance, sans relance par défaut", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onSetReminder = vi.fn();
    render(
      <MoveActionSheet
        action={makeAction()}
        phaseOptions={[]}
        statusLabels={STATUS_LABELS}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        onSetReminder={onSetReminder}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Statut/ }));
    await user.click(screen.getByRole("button", { name: "En attente" }));
    expect(await screen.findByText(/Passer « Relancer le prestataire » en attente/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(onConfirm).toHaveBeenCalledWith({ axis: "status", status: "waiting" });
    expect(onSetReminder).not.toHaveBeenCalled();
  });

  it("relance activée avec un nombre de jours invalide bloque la confirmation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onSetReminder = vi.fn();
    render(
      <MoveActionSheet
        action={makeAction()}
        phaseOptions={[]}
        statusLabels={STATUS_LABELS}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        onSetReminder={onSetReminder}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Statut/ }));
    await user.click(screen.getByRole("button", { name: "En attente" }));
    await user.click(screen.getByLabelText("Activer une relance automatique"));

    const daysInput = screen.getByLabelText("Relance après (jours)");
    await user.clear(daysInput);
    await user.type(daysInput, "0");

    expect(screen.getByRole("button", { name: "Confirmer" })).toBeDisabled();
  });

  it("relance activée avec un nombre de jours valide notifie onSetReminder", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onSetReminder = vi.fn();
    render(
      <MoveActionSheet
        action={makeAction()}
        phaseOptions={[]}
        statusLabels={STATUS_LABELS}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
        onSetReminder={onSetReminder}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Statut/ }));
    await user.click(screen.getByRole("button", { name: "En attente" }));
    await user.click(screen.getByLabelText("Activer une relance automatique"));

    const daysInput = screen.getByLabelText("Relance après (jours)");
    await user.clear(daysInput);
    await user.type(daysInput, "5");
    await user.click(screen.getByRole("button", { name: "Confirmer" }));

    expect(onConfirm).toHaveBeenCalledWith({ axis: "status", status: "waiting" });
    expect(onSetReminder).toHaveBeenCalledWith(5);
  });

  it("Retour depuis l'étape statut revient au choix de l'axe", async () => {
    const user = userEvent.setup();
    render(
      <MoveActionSheet
        action={makeAction()}
        phaseOptions={[]}
        statusLabels={STATUS_LABELS}
        onCancel={vi.fn()}
        onConfirm={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Statut/ }));
    await user.click(screen.getByRole("button", { name: "Retour" }));
    expect(await screen.findByText(/Déplacer « Relancer le prestataire »/)).toBeInTheDocument();
  });
});

describe("MoveActionSheet — axe Phase", () => {
  it("confirme la phase choisie", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <MoveActionSheet
        action={makeAction()}
        phaseOptions={["cadrage", "deploiement"]}
        statusLabels={STATUS_LABELS}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Phase/ }));
    await user.click(screen.getByRole("button", { name: "Cadrage" }));

    expect(onConfirm).toHaveBeenCalledWith({ axis: "phase", phaseId: "cadrage" });
  });
});

describe("MoveActionSheet — axe Planification", () => {
  it("planification hebdomadaire simple : Confirmer actif sans confirmation supplémentaire", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <MoveActionSheet
        action={makeAction({ schedule: { granularity: "week", value: "2026-W10" } })}
        phaseOptions={[]}
        statusLabels={STATUS_LABELS}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Planification/ }));
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ axis: "schedule", to: expect.objectContaining({ kind: "week" }) })
    );
  });

  it("passage d'une planification mensuelle exige la case de confirmation", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(
      <MoveActionSheet
        action={makeAction({ schedule: { granularity: "month", value: "2026-09" } })}
        phaseOptions={[]}
        statusLabels={STATUS_LABELS}
        onCancel={vi.fn()}
        onConfirm={onConfirm}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Planification/ }));
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeDisabled();

    await user.click(screen.getByLabelText(/Je confirme le passage d'une planification mensuelle/));
    expect(screen.getByRole("button", { name: "Confirmer" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Confirmer" }));
    expect(onConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ to: expect.objectContaining({ confirmed: true }) })
    );
  });

  it("Annuler déclenche onCancel", async () => {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    render(
      <MoveActionSheet
        action={makeAction()}
        phaseOptions={[]}
        statusLabels={STATUS_LABELS}
        onCancel={onCancel}
        onConfirm={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /^Planification/ }));
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

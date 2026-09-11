import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action, ActionStatus } from "../../domain/types";
import type { Workspace } from "../../domain/workspace";
import { ActionDetailSheet } from "./ActionDetailSheet";

const STATUS_LABELS: Record<ActionStatus, string> = {
  todo: "À faire",
  doing: "En cours",
  blocked: "Bloqué",
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

function baseProps(overrides: Partial<Parameters<typeof ActionDetailSheet>[0]> = {}) {
  return {
    action: makeAction(),
    phaseOptions: [],
    statusLabels: STATUS_LABELS,
    timezone: "Europe/Paris",
    workspaces: [] as Workspace[],
    actionsByWorkspace: {},
    onClose: vi.fn(),
    onEdit: vi.fn(),
    onMove: vi.fn(),
    onSetReminder: vi.fn(),
    onDisableReminder: vi.fn(),
    onAddNote: vi.fn(),
    onLink: vi.fn(),
    onUnlink: vi.fn(),
    onNavigate: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

describe("ActionDetailSheet — ouverture et rangées", () => {
  it("affiche le titre et les rangées principales", () => {
    render(<ActionDetailSheet {...baseProps()} />);
    expect(screen.getByRole("dialog", { name: "Relancer le prestataire" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Relancer le prestataire" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Statut/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Priorité/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Type/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Échéance/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Notes/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Lien/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Déplacer/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Supprimer/ })).toBeInTheDocument();
  });

  it("ne montre pas la rangée Phase si aucune phase dans l'approche", () => {
    render(<ActionDetailSheet {...baseProps()} />);
    expect(screen.queryByRole("button", { name: /^Phase/ })).not.toBeInTheDocument();
  });

  it("montre la rangée Phase quand des phases existent", () => {
    render(<ActionDetailSheet {...baseProps({ phaseOptions: ["cadrage"] })} />);
    expect(screen.getByRole("button", { name: /^Phase/ })).toBeInTheDocument();
  });

  it("le bouton de fermeture appelle onClose", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ActionDetailSheet {...baseProps({ onClose })} />);
    await user.click(screen.getByRole("button", { name: "Fermer le détail" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("le clic sur le fond (backdrop) ferme le détail", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const { container } = render(<ActionDetailSheet {...baseProps({ onClose })} />);
    await user.click(container.querySelector(".action-detail-backdrop")!);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Échap ferme le détail quand aucune sous-sheet n'est ouverte", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ActionDetailSheet {...baseProps({ onClose })} />);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Échap ferme seulement la sous-sheet quand une est ouverte, jamais le détail en dessous (Lot 6 §J)", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<ActionDetailSheet {...baseProps({ onClose })} />);

    await user.click(screen.getByRole("button", { name: /^Notes/ }));
    expect(screen.getByText(/Notes - Relancer le prestataire/)).toBeInTheDocument();

    await user.keyboard("{Escape}");

    // La sous-sheet Notes s'est fermée...
    expect(screen.queryByText(/Notes - Relancer le prestataire/)).not.toBeInTheDocument();
    // ...mais le détail en dessous est resté ouvert (une seule frappe, une seule couche fermée).
    expect(screen.getByRole("dialog", { name: "Relancer le prestataire" })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe("ActionDetailSheet — orchestration des sheets existantes", () => {
  it("Statut ouvre MoveActionSheet directement sur l'axe statut", async () => {
    const user = userEvent.setup();
    const onMove = vi.fn();
    render(<ActionDetailSheet {...baseProps({ onMove })} />);

    await user.click(screen.getByRole("button", { name: /^Statut/ }));
    // Sauté l'écran de choix d'axe : directement les statuts.
    await user.click(screen.getByRole("button", { name: "Terminé" }));
    expect(onMove).toHaveBeenCalledWith({ axis: "status", status: "done" });
  });

  it("Échéance ouvre MoveActionSheet directement sur l'axe planification", async () => {
    const user = userEvent.setup();
    render(<ActionDetailSheet {...baseProps()} />);

    await user.click(screen.getByRole("button", { name: /^Échéance/ }));
    expect(screen.getByText("Déplacer vers la semaine")).toBeInTheDocument();
  });

  it("Déplacer ouvre MoveActionSheet avec le choix de l'axe (pas de saut)", async () => {
    const user = userEvent.setup();
    render(<ActionDetailSheet {...baseProps()} />);

    await user.click(screen.getByRole("button", { name: /^Déplacer/ }));
    expect(screen.getByText(/Déplacer « Relancer le prestataire »/)).toBeInTheDocument();
  });

  it("Priorité et Type ouvrent EditActionSheet et onEdit est appelé à la sauvegarde", async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    render(<ActionDetailSheet {...baseProps({ onEdit })} />);

    await user.click(screen.getByRole("button", { name: /^Priorité/ }));
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    expect(onEdit).toHaveBeenCalled();
  });

  it("Notes ouvre NotesSheet et onAddNote est appelé", async () => {
    const user = userEvent.setup();
    const onAddNote = vi.fn();
    render(<ActionDetailSheet {...baseProps({ onAddNote })} />);

    await user.click(screen.getByRole("button", { name: /^Notes/ }));
    await user.type(screen.getByRole("textbox"), "Un point important");
    await user.click(screen.getByRole("button", { name: "Ajouter la note" }));
    expect(onAddNote).toHaveBeenCalledWith("Un point important");
  });

  it("Lien ouvre LinkActionSheet", async () => {
    const user = userEvent.setup();
    render(<ActionDetailSheet {...baseProps()} />);

    await user.click(screen.getByRole("button", { name: /^Lien/ }));
    expect(screen.getByText(/Lien - Relancer le prestataire/)).toBeInTheDocument();
  });

  it("Supprimer appelle onDelete puis onClose", async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    const onClose = vi.fn();
    render(<ActionDetailSheet {...baseProps({ onDelete, onClose })} />);

    await user.click(screen.getByRole("button", { name: /^Supprimer/ }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("affiche la relance active avec un bouton Désactiver, uniquement en attente", async () => {
    const user = userEvent.setup();
    const onDisableReminder = vi.fn();
    const action = makeAction({
      status: "waiting",
      waitingReminder: { afterDays: 3, enabled: true, history: [] },
    });
    render(<ActionDetailSheet {...baseProps({ action, onDisableReminder })} />);

    expect(screen.getByText("Après 3 j")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Désactiver" }));
    expect(onDisableReminder).toHaveBeenCalledTimes(1);
  });

  it("aucune rangée Relance affichée hors statut 'En attente'", () => {
    render(<ActionDetailSheet {...baseProps()} />);
    expect(screen.queryByText("Relance")).not.toBeInTheDocument();
  });
});

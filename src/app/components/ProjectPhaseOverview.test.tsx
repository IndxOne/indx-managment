import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Action } from "../../domain/types";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { ProjectPhaseOverview } from "./ProjectPhaseOverview";

function action(overrides: Partial<Action> = {}): Action {
  return {
    id: "a1",
    workspaceId: "w1",
    title: "Action",
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

const PHASES = ["cadrage", "conception", "realisation"];

function baseProps(overrides: Partial<Parameters<typeof ProjectPhaseOverview>[0]> = {}) {
  return {
    phases: PHASES,
    actionsByPhase: {
      cadrage: [action({ id: "a1", title: "Cadrer le besoin", priority: "high" })],
      conception: [action({ id: "a2", title: "Maquetter", status: "done" })],
      realisation: [],
    },
    statusLabels: STATUS_LABELS_DEFAULT,
    timezone: "Europe/Paris",
    currentPhase: "cadrage",
    onSelectPhase: vi.fn(),
    onAddToPhase: vi.fn(),
    onQuickCreate: vi.fn(),
    onMove: vi.fn(),
    onCycleStatus: vi.fn(),
    onComplete: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onDisableReminder: vi.fn(),
    onOpenNotes: vi.fn(),
    onOpenLink: vi.fn(),
    onOpenDetail: vi.fn(),
    ...overrides,
  };
}

describe("ProjectPhaseOverview — hiérarchie verticale mobile (Lot B)", () => {
  it("affiche le statut et la priorité dérivés de l'espace (Header)", () => {
    render(<ProjectPhaseOverview {...baseProps()} />);
    expect(screen.getByText("Actif")).toBeInTheDocument();
    expect(screen.getByText("Haute")).toBeInTheDocument();
  });

  it("affiche une progression unique et lisible (1/2 terminée, 50%)", () => {
    render(<ProjectPhaseOverview {...baseProps()} />);
    expect(screen.getByText("1/2 (50%)")).toBeInTheDocument();
  });

  it("met en avant la phase actuelle et n'affiche que ses actions dans la liste principale", () => {
    render(<ProjectPhaseOverview {...baseProps()} />);
    const currentTab = screen.getByRole("tab", { name: /Cadrage/ });
    expect(currentTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Cadrer le besoin")).toBeInTheDocument();
    // "Maquetter" appartient à une autre phase : pas dans la liste principale.
    expect(screen.queryByText("Maquetter")).not.toBeInTheDocument();
  });

  it("change de phase actuelle au clic sur un autre onglet de phase", async () => {
    const user = userEvent.setup();
    const onSelectPhase = vi.fn();
    render(<ProjectPhaseOverview {...baseProps({ onSelectPhase })} />);
    await user.click(screen.getByRole("tab", { name: /Conception/ }));
    expect(onSelectPhase).toHaveBeenCalledWith("conception");
  });

  it("« Jalons / phases suivantes » est repliée par défaut puis dévoile les autres phases au clic", async () => {
    const user = userEvent.setup();
    render(<ProjectPhaseOverview {...baseProps()} />);

    expect(screen.queryByRole("button", { name: "Conception" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /Jalons \/ phases suivantes/ }));
    expect(screen.getByRole("button", { name: /Conception/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Réalisation/ })).toBeInTheDocument();
  });

  it("sélectionner une phase depuis « Jalons » la fait devenir la phase actuelle", async () => {
    const user = userEvent.setup();
    const onSelectPhase = vi.fn();
    render(<ProjectPhaseOverview {...baseProps({ onSelectPhase })} />);

    await user.click(screen.getByRole("button", { name: /Jalons \/ phases suivantes/ }));
    await user.click(screen.getByRole("button", { name: /^Conception/ }));
    expect(onSelectPhase).toHaveBeenCalledWith("conception");
  });

  it("le clic sur le titre d'une action ouvre le détail, séparément de la case à cocher (préserve l'ouverture vs complétion)", async () => {
    const user = userEvent.setup();
    const onOpenDetail = vi.fn();
    const onCycleStatus = vi.fn();
    render(<ProjectPhaseOverview {...baseProps({ onOpenDetail, onCycleStatus })} />);

    await user.click(screen.getByRole("button", { name: /^Cadrer le besoin/ }));
    expect(onOpenDetail).toHaveBeenCalledTimes(1);
    expect(onCycleStatus).not.toHaveBeenCalled();

    await user.click(screen.getByRole("checkbox"));
    expect(onCycleStatus).toHaveBeenCalledTimes(1);
  });
});

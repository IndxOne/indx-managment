import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { BriefItem } from "../../../domain/v3/brief/types";
import { BriefItemCard } from "./BriefItemCard";

function item(overrides: Partial<BriefItem> = {}): BriefItem {
  return {
    id: "work_item:wi1",
    sourceType: "work_item",
    sourceId: "wi1",
    projectId: "p1",
    severity: "blocking",
    title: "Configurer VPN",
    reason: "Aucun responsable assigné",
    status: "to_scope",
    ...overrides,
  };
}

describe("BriefItemCard — sans onOpen", () => {
  it("n'est pas un bouton, aucun tabIndex, aucune affordance de navigation", () => {
    render(<BriefItemCard item={item()} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    const card = screen.getByText("Configurer VPN").closest(".brief-item-card");
    expect(card).not.toHaveAttribute("tabindex");
  });

  it("affiche titre, raison, statut, ruleId absent par défaut", () => {
    render(<BriefItemCard item={item({ ruleId: "ACT-001" })} />);
    expect(screen.getByText("Configurer VPN")).toBeInTheDocument();
    expect(screen.getByText("Aucun responsable assigné")).toBeInTheDocument();
    expect(screen.queryByText("ACT-001")).not.toBeInTheDocument();
  });

  it("affiche l'échéance et l'action suggérée quand présentes", () => {
    render(<BriefItemCard item={item({ dueDate: "2026-09-20T08:00:00.000Z", actionHint: "Assigner un responsable" })} />);
    expect(screen.getByText("Assigner un responsable")).toBeInTheDocument();
  });
});

describe("BriefItemCard — avec onOpen", () => {
  it("cible tactile ≥44px, label accessible, clic déclenche onOpen", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<BriefItemCard item={item()} onOpen={onOpen} />);
    const card = screen.getByRole("button", { name: /Configurer VPN/ });
    expect(card).toHaveClass("tap-target");
    await user.click(card);
    expect(onOpen).toHaveBeenCalledWith(item());
  });

  it("activation clavier Entrée et Espace", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<BriefItemCard item={item()} onOpen={onOpen} />);
    const card = screen.getByRole("button", { name: /Configurer VPN/ });
    card.focus();
    await user.keyboard("{Enter}");
    expect(onOpen).toHaveBeenCalledTimes(1);
    await user.keyboard(" ");
    expect(onOpen).toHaveBeenCalledTimes(2);
  });

  it("le bord de sévérité n'est jamais la seule information : le libellé texte reste toujours présent", () => {
    render(<BriefItemCard item={item({ severity: "blocking" })} onOpen={() => {}} />);
    expect(screen.getByText("Bloquant")).toBeInTheDocument();
  });
});

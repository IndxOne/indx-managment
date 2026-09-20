import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { HomeProjectCard as HomeProjectCardData } from "../../../domain/v3/home/types";
import { HomeProjectCard } from "./HomeProjectCard";

function project(overrides: Partial<HomeProjectCardData> = {}): HomeProjectCardData {
  return {
    id: "p1",
    name: "Migration M365",
    status: "on_track",
    criticality: "high",
    needsAttention: false,
    ...overrides,
  };
}

describe("HomeProjectCard", () => {
  it("affiche nom, statut, criticité", () => {
    render(<HomeProjectCard project={project()} onOpen={() => {}} />);
    expect(screen.getByText("Migration M365")).toBeInTheDocument();
    expect(screen.getByText("Dans les temps")).toBeInTheDocument();
    expect(screen.getByText("Haute")).toBeInTheDocument();
  });

  it("affiche le prochain jalon quand présent", () => {
    render(
      <HomeProjectCard
        project={project({ nextMilestone: { id: "m1", observableResult: "VPN configuré", targetDate: "2026-10-05T00:00:00.000Z" } })}
        onOpen={() => {}}
      />
    );
    expect(screen.getByText(/VPN configuré/)).toBeInTheDocument();
  });

  it("absence de jalon -> message explicite, jamais un champ vide", () => {
    render(<HomeProjectCard project={project()} onOpen={() => {}} />);
    expect(screen.getByText("Aucun jalon planifié")).toBeInTheDocument();
  });

  it("badge Attention affiché seulement si needsAttention", () => {
    const { rerender } = render(<HomeProjectCard project={project({ needsAttention: false })} onOpen={() => {}} />);
    expect(screen.queryByText("Attention")).not.toBeInTheDocument();
    rerender(<HomeProjectCard project={project({ needsAttention: true })} onOpen={() => {}} />);
    expect(screen.getByText("Attention")).toBeInTheDocument();
  });

  it("clic déclenche onOpen avec l'id du projet, cible tactile ≥44px", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    render(<HomeProjectCard project={project({ id: "p42" })} onOpen={onOpen} />);
    const card = screen.getByRole("button", { name: /Migration M365/ });
    expect(card).toHaveClass("tap-target");
    await user.click(card);
    expect(onOpen).toHaveBeenCalledWith("p42");
  });
});

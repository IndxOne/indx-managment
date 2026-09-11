import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { EmptyState, ErrorState, LoadingState, NoResultsState, OfflineBanner } from "./StateBlocks";

describe("États obligatoires (cadrage §8)", () => {
  it("EmptyState expose un rôle status et un titre", () => {
    render(<EmptyState title="Aucun espace pour l'instant" />);
    expect(screen.getByRole("status")).toHaveTextContent("Aucun espace pour l'instant");
  });

  it("LoadingState annonce le chargement en aria-live poli", () => {
    render(<LoadingState label="Chargement…" />);
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-live", "polite");
    expect(el).toHaveAttribute("aria-busy", "true");
    expect(el).toHaveTextContent("Chargement…");
    expect(el.querySelectorAll(".skeleton-card")).toHaveLength(4);
  });

  it("ErrorState expose un rôle alert et un bouton réessayer optionnel", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();
    render(<ErrorState description="Une erreur" onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("NoResultsState permet de réinitialiser les filtres", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    render(<NoResultsState onClearFilters={onClear} />);
    await user.click(screen.getByRole("button", { name: /Réinitialiser/ }));
    expect(onClear).toHaveBeenCalled();
  });

  it("OfflineBanner annonce l'état hors connexion", () => {
    render(<OfflineBanner />);
    expect(screen.getByRole("status")).toHaveTextContent(/Hors connexion/);
  });
});

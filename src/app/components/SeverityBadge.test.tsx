import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SeverityBadge } from "./SeverityBadge";

describe("SeverityBadge", () => {
  it("affiche toujours le libellé texte, jamais la couleur seule", () => {
    render(<SeverityBadge tone="critical" label="Bloquant" />);
    expect(screen.getByText("Bloquant")).toBeInTheDocument();
  });

  it("porte la tonalité en attribut data-tone, jamais en style inline", () => {
    render(<SeverityBadge tone="attention" label="À surveiller" />);
    const badge = screen.getByText("À surveiller");
    expect(badge).toHaveAttribute("data-tone", "attention");
    expect(badge).not.toHaveAttribute("style");
  });
});

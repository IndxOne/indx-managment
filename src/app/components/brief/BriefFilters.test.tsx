import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BriefFilters } from "./BriefFilters";

describe("BriefFilters", () => {
  it("rend les 6 filtres, marque le filtre actif, déclenche onChange", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BriefFilters active="all" onChange={onChange} />);

    ["Tous", "Bloquants", "Retards", "Décisions", "Risques", "Jalons"].forEach((label) => {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Tous" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Bloquants" }));
    expect(onChange).toHaveBeenCalledWith("blocked");
  });
});

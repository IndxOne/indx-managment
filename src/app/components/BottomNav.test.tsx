import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BottomNav } from "./BottomNav";

describe("BottomNav", () => {
  it("affiche les 4 entrées recommandées par le cadrage §8", () => {
    render(<BottomNav active="today" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Aujourd'hui/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Semaine/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Espaces/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Plus/ })).toBeInTheDocument();
  });

  it("marque l'onglet actif avec aria-current", () => {
    render(<BottomNav active="spaces" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /Espaces/ })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: /Aujourd'hui/ })).not.toHaveAttribute("aria-current");
  });

  it("chaque cible tactile respecte le minimum 44px (classe tap-target)", () => {
    render(<BottomNav active="today" onChange={() => {}} />);
    for (const button of screen.getAllByRole("button")) {
      expect(button).toHaveClass("tap-target");
    }
  });

  it("appelle onChange au clic et au clavier (Entrée)", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<BottomNav active="today" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: /Semaine/ }));
    expect(onChange).toHaveBeenCalledWith("week");

    screen.getByRole("button", { name: /Plus/ }).focus();
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("more");
  });
});

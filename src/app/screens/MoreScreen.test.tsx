import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MoreScreen } from "./MoreScreen";

describe("MoreScreen", () => {
  it("liste les 6 destinations secondaires et déclenche onSelect avec la bonne clé", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<MoreScreen onSelect={onSelect} />);

    const expected = [
      ["Cette semaine", "week"],
      ["Relances", "reminders"],
      ["Mon Brief", "brief"],
      ["Notes", "carnet"],
      ["Recherche", "search"],
      ["Réglages", "app-settings"],
    ] as const;
    for (const [label, key] of expected) {
      await user.click(screen.getByRole("button", { name: label }));
      expect(onSelect).toHaveBeenLastCalledWith(key);
    }
    expect(screen.getAllByRole("button")).toHaveLength(expected.length);
    // Retirés (jugés superflus) : plus jamais proposés.
    expect(screen.queryByRole("button", { name: "Hub" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Approches métier" })).not.toBeInTheDocument();
  });
});

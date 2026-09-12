import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { SegmentedTabs } from "./SegmentedTabs";

describe("SegmentedTabs", () => {
  it("expose un tablist accessible avec l'onglet actif marqué", () => {
    render(
      <SegmentedTabs
        ariaLabel="Vue temporelle"
        options={[
          { id: "today", label: "Aujourd'hui" },
          { id: "week", label: "Cette semaine" },
        ]}
        value="today"
        onChange={vi.fn()}
      />
    );

    expect(screen.getByRole("tablist", { name: "Vue temporelle" })).toBeInTheDocument();
    const today = screen.getByRole("tab", { name: "Aujourd'hui" });
    const week = screen.getByRole("tab", { name: "Cette semaine" });
    expect(today).toHaveAttribute("aria-selected", "true");
    expect(today).toHaveAttribute("aria-current", "true");
    expect(week).toHaveAttribute("aria-selected", "false");
  });

  it("le clic sur un autre onglet appelle onChange avec son id", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <SegmentedTabs
        ariaLabel="Organisation"
        options={[
          { id: "phase", label: "Par étapes" },
          { id: "week", label: "Par semaine" },
        ]}
        value="phase"
        onChange={onChange}
      />
    );

    await user.click(screen.getByRole("tab", { name: "Par semaine" }));
    expect(onChange).toHaveBeenCalledWith("week");
  });

  it("chaque onglet reste focusable/activable au clavier (bouton natif)", () => {
    render(
      <SegmentedTabs
        ariaLabel="Vue temporelle"
        options={[
          { id: "today", label: "Aujourd'hui" },
          { id: "week", label: "Cette semaine" },
        ]}
        value="today"
        onChange={vi.fn()}
      />
    );

    for (const tab of screen.getAllByRole("tab")) {
      expect(tab.tagName).toBe("BUTTON");
      expect(tab).toHaveAttribute("type", "button");
    }
  });

  it("généralise le curseur à plus de deux onglets (largeur et position calculées)", () => {
    const { container } = render(
      <SegmentedTabs
        ariaLabel="Trois options"
        options={[
          { id: "a", label: "A" },
          { id: "b", label: "B" },
          { id: "c", label: "C" },
        ]}
        value="c"
        onChange={vi.fn()}
      />
    );

    const thumb = container.querySelector(".segmented-thumb") as HTMLElement;
    expect(thumb.style.width).toMatch(/0\.3333333333333333.*100% - 4px/);
    expect(thumb.style.transform).toBe("translateX(200%)");
  });
});

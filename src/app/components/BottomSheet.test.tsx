import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { BottomSheet } from "./BottomSheet";

/**
 * Régression : un champ enfant avec autoFocus (ex. AddActionSheet) monte
 * avant l'effet du parent BottomSheet, qui capturait alors ce champ comme
 * "focus précédent" au lieu du déclencheur — le focus se perdait sur
 * <body> à la fermeture au lieu de revenir au bouton d'ouverture.
 */
function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Ouvrir</button>
      {open && (
        <BottomSheet title="Test" onClose={() => setOpen(false)}>
          <input autoFocus placeholder="champ auto-focus" />
        </BottomSheet>
      )}
    </>
  );
}

describe("BottomSheet — gestion du focus", () => {
  afterEach(() => vi.restoreAllMocks());
  it("restitue le focus au déclencheur après Échap, malgré un champ autoFocus enfant", () => {
    render(<Harness />);
    const trigger = screen.getByText("Ouvrir");
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.activeElement).toBe(trigger);
  });

  it("remonte et focalise le premier champ devenu invalide", async () => {
    const scrollIntoView = vi.fn();
    HTMLElement.prototype.scrollIntoView = scrollIntoView;
    render(
      <BottomSheet title="Test" onClose={() => {}}>
        <input aria-label="Titre" aria-invalid="false" />
      </BottomSheet>
    );

    const field = screen.getByLabelText("Titre");
    fireEvent.change(field, { target: { value: "" } });
    field.setAttribute("aria-invalid", "true");
    await vi.waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: "center", behavior: "smooth" }));
    expect(document.activeElement).toBe(field);
  });

  it("reste au-dessus du clavier grâce à la hauteur du visual viewport", () => {
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 390 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 844 });
    Object.defineProperty(window, "visualViewport", {
      configurable: true,
      value: {
        height: 500,
        offsetTop: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
    });

    render(<BottomSheet title="Test" onClose={() => {}}>Contenu</BottomSheet>);

    expect(screen.getByRole("dialog")).toHaveStyle({ bottom: "352px", maxHeight: "484px" });
  });
});

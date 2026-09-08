import { useState } from "react";
import { describe, expect, it } from "vitest";
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
});

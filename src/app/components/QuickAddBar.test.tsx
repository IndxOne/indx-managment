import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { QuickAddBar } from "./QuickAddBar";

describe("QuickAddBar", () => {
  it("crée à l'appui sur Entrée, vide le champ et garde le focus pour enchaîner", async () => {
    const user = userEvent.setup();
    const onQuickAdd = vi.fn();
    render(<QuickAddBar onQuickAdd={onQuickAdd} onOpenFullForm={vi.fn()} />);

    const input = screen.getByLabelText("Nouvelle action");
    await user.type(input, "Première action{Enter}");

    expect(onQuickAdd).toHaveBeenCalledWith("Première action");
    expect(input).toHaveValue("");
    expect(input).toHaveFocus();
  });

  it("n'appelle rien pour un titre vide ou blanc", async () => {
    const user = userEvent.setup();
    const onQuickAdd = vi.fn();
    render(<QuickAddBar onQuickAdd={onQuickAdd} onOpenFullForm={vi.fn()} />);

    await user.type(screen.getByLabelText("Nouvelle action"), "   {Enter}");

    expect(onQuickAdd).not.toHaveBeenCalled();
  });

  it("le bouton options avancées transmet le brouillon de titre déjà saisi", async () => {
    const user = userEvent.setup();
    const onOpenFullForm = vi.fn();
    render(<QuickAddBar onQuickAdd={vi.fn()} onOpenFullForm={onOpenFullForm} />);

    await user.type(screen.getByLabelText("Nouvelle action"), "Brouillon");
    await user.click(screen.getByRole("button", { name: /Options avancées/ }));

    expect(onOpenFullForm).toHaveBeenCalledWith("Brouillon");
  });
});

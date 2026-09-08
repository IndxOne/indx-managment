import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { StoreProvider } from "../adapters/temporary-store";
import { CreateWorkspaceScreen } from "./CreateWorkspaceScreen";

function renderScreen(onCreated = vi.fn(), onCancel = vi.fn()) {
  render(
    <StoreProvider>
      <CreateWorkspaceScreen onCreated={onCreated} onCancel={onCancel} />
    </StoreProvider>
  );
  return { onCreated, onCancel };
}

describe("CreateWorkspaceScreen", () => {
  it("bloque la soumission et affiche une erreur quand le nom est vide", async () => {
    const user = userEvent.setup();
    const { onCreated } = renderScreen();

    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Le nom de l'espace est requis.");
    expect(onCreated).not.toHaveBeenCalled();
  });

  it("appelle onCreated avec le workspace créé quand le nom est renseigné", async () => {
    const user = userEvent.setup();
    const { onCreated } = renderScreen();

    await user.type(screen.getByLabelText("Nom de l'espace"), "Suivi quotidien");
    await user.click(screen.getByRole("button", { name: "Créer l'espace" }));

    expect(onCreated).toHaveBeenCalledTimes(1);
    expect(onCreated).toHaveBeenCalledWith(expect.objectContaining({ name: "Suivi quotidien", kind: "run" }));
  });

  it("changer la nature de l'espace adapte l'approche métier suggérée", async () => {
    const user = userEvent.setup();
    renderScreen();

    expect(screen.getByLabelText("Approche métier (modifiable)")).toHaveValue("it_ops");
    await user.click(screen.getByLabelText("Projet avec étapes (PROJET)"));
    expect(screen.getByLabelText("Approche métier (modifiable)")).toHaveValue("project_amoa");
  });

  it("Annuler déclenche onCancel", async () => {
    const user = userEvent.setup();
    const { onCancel } = renderScreen();

    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});

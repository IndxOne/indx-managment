import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { AddActionSheet } from "./AddActionSheet";

describe("AddActionSheet — comportement existant (écran d'espace, sans sélecteur de destination)", () => {
  it("crée une action sans exposer de sélecteur de destination (workspaceOptions absent)", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<AddActionSheet onCancel={vi.fn()} onCreate={onCreate} />);

    expect(screen.queryByRole("radiogroup", { name: "Destination" })).not.toBeInTheDocument();
    await user.type(screen.getByLabelText("Titre"), "Relancer le client");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    const input = onCreate.mock.calls[0]?.[0];
    if (!input) throw new Error("onCreate non appelé");
    expect(input.title).toBe("Relancer le client");
    expect(input).not.toHaveProperty("workspaceId");
  });
});

describe("AddActionSheet — création rapide globale (v2.2 §5, sélecteur Action RUN / Tâche Projet)", () => {
  const options = [
    { id: "run-1", name: "Support quotidien", kind: "run" as const },
    { id: "proj-1", name: "Refonte CRM", kind: "project" as const },
    { id: "proj-2", name: "Site vitrine", kind: "project" as const },
  ];

  it("affiche le sélecteur de destination et présélectionne RUN quand un espace RUN existe", () => {
    render(<AddActionSheet workspaceOptions={options} onCancel={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByRole("radiogroup", { name: "Destination" })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Action RUN" })).toBeChecked();
  });

  it("crée une Action RUN : onCreate reçoit le workspaceId de l'espace RUN", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<AddActionSheet workspaceOptions={options} onCancel={vi.fn()} onCreate={onCreate} />);

    await user.type(screen.getByLabelText("Titre"), "Investiguer un incident");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0]?.[0]).toMatchObject({ title: "Investiguer un incident", workspaceId: "run-1" });
  });

  it("bascule sur Tâche Projet : impose de choisir un projet cible parmi plusieurs", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<AddActionSheet workspaceOptions={options} onCancel={vi.fn()} onCreate={onCreate} />);

    await user.click(screen.getByRole("radio", { name: "Tâche Projet" }));
    await user.type(screen.getByLabelText("Titre"), "Rédiger le cahier des charges");
    await user.selectOptions(screen.getByLabelText("Projet cible"), "proj-2");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    expect(onCreate).toHaveBeenCalledTimes(1);
    expect(onCreate.mock.calls[0]?.[0]).toMatchObject({
      title: "Rédiger le cahier des charges",
      workspaceId: "proj-2",
    });
  });

  it("sans aucun espace RUN, présélectionne Tâche Projet et désactive le radio RUN", () => {
    const projectOnly = options.filter((option) => option.kind === "project");
    render(<AddActionSheet workspaceOptions={projectOnly} onCancel={vi.fn()} onCreate={vi.fn()} />);
    expect(screen.getByRole("radio", { name: "Action RUN" })).toBeDisabled();
    expect(screen.getByRole("radio", { name: "Tâche Projet" })).toBeChecked();
  });

  it("sans aucun espace du tout, refuse la création avec un message explicite", async () => {
    const user = userEvent.setup();
    const onCreate = vi.fn();
    render(<AddActionSheet workspaceOptions={[]} onCancel={vi.fn()} onCreate={onCreate} />);

    await user.type(screen.getByLabelText("Titre"), "Une action");
    await user.click(screen.getByRole("button", { name: "Créer l'action" }));

    expect(onCreate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("Choisis un espace de destination.");
  });
});

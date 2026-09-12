import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Member } from "../../domain/member";
import { MemberAssignSheet } from "./MemberAssignSheet";

function member(overrides: Partial<Member> = {}): Member {
  return {
    id: "m1",
    workspaceId: "w1",
    displayName: "Koffi",
    active: true,
    createdAt: "2026-09-01T00:00:00.000Z",
    updatedAt: "2026-09-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("MemberAssignSheet", () => {
  it("« Non assigné » est coché quand assigneeIds est vide", () => {
    render(<MemberAssignSheet members={[member()]} assigneeIds={[]} onClose={vi.fn()} onChangeAssignees={vi.fn()} />);
    expect(screen.getByRole("checkbox", { name: "Non assigné" })).toBeChecked();
  });

  it("cocher un membre actif ajoute son id à assigneeIds", async () => {
    const user = userEvent.setup();
    const onChangeAssignees = vi.fn();
    render(<MemberAssignSheet members={[member()]} assigneeIds={[]} onClose={vi.fn()} onChangeAssignees={onChangeAssignees} />);
    await user.click(screen.getByRole("checkbox", { name: "Koffi" }));
    expect(onChangeAssignees).toHaveBeenCalledWith(["m1"]);
  });

  it("décocher un membre déjà assigné le retire (multi-assignation conservée)", async () => {
    const user = userEvent.setup();
    const onChangeAssignees = vi.fn();
    const alice = member({ id: "m2", displayName: "Alice" });
    render(
      <MemberAssignSheet
        members={[member(), alice]}
        assigneeIds={["m1", "m2"]}
        onClose={vi.fn()}
        onChangeAssignees={onChangeAssignees}
      />
    );
    await user.click(screen.getByRole("checkbox", { name: "Koffi" }));
    expect(onChangeAssignees).toHaveBeenCalledWith(["m2"]);
  });

  it("ne propose jamais un membre inactif pour une nouvelle assignation", () => {
    const inactive = member({ id: "m2", displayName: "Alice", active: false });
    render(<MemberAssignSheet members={[member(), inactive]} assigneeIds={[]} onClose={vi.fn()} onChangeAssignees={vi.fn()} />);
    expect(screen.queryByRole("checkbox", { name: /Alice/ })).not.toBeInTheDocument();
  });

  it("un membre inactif déjà assigné reste affiché et peut être retiré", async () => {
    const user = userEvent.setup();
    const onChangeAssignees = vi.fn();
    const inactive = member({ id: "m2", displayName: "Alice", active: false });
    render(
      <MemberAssignSheet
        members={[inactive]}
        assigneeIds={["m2"]}
        onClose={vi.fn()}
        onChangeAssignees={onChangeAssignees}
      />
    );
    const checkbox = screen.getByRole("checkbox", { name: /Alice/ });
    expect(checkbox).toBeChecked();
    expect(screen.getByText(/Inactif/)).toBeInTheDocument();
    await user.click(checkbox);
    expect(onChangeAssignees).toHaveBeenCalledWith([]);
  });

  it("cliquer « Non assigné » retire toutes les assignations", async () => {
    const user = userEvent.setup();
    const onChangeAssignees = vi.fn();
    render(
      <MemberAssignSheet members={[member()]} assigneeIds={["m1"]} onClose={vi.fn()} onChangeAssignees={onChangeAssignees} />
    );
    await user.click(screen.getByRole("checkbox", { name: "Non assigné" }));
    expect(onChangeAssignees).toHaveBeenCalledWith([]);
  });
});

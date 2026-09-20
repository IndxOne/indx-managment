import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { BriefItem } from "../../../domain/v3/brief/types";
import { BriefSection } from "./BriefSection";

function item(id: string, title: string): BriefItem {
  return { id, sourceType: "work_item", sourceId: id, projectId: "p1", severity: "info", title, reason: "x", status: "open" };
}

describe("BriefSection", () => {
  it("ne rend rien si items est vide", () => {
    const { container } = render(<BriefSection title="Décisions" items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("rend le titre et conserve l'ordre des items", () => {
    render(<BriefSection title="À traiter" items={[item("1", "Premier"), item("2", "Second")]} />);
    expect(screen.getByText("À traiter")).toBeInTheDocument();
    const titles = screen.getAllByText(/Premier|Second/);
    expect(titles.map((t) => t.textContent)).toEqual(["Premier", "Second"]);
  });
});

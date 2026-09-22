import { describe, expect, it } from "vitest";
import type { ProjectOverviewProjection } from "../../domain/v3/project-overview/types";
import { buildProjectContextRows } from "./project-overview-labels";

function project(overrides: Partial<ProjectOverviewProjection["project"]> = {}): ProjectOverviewProjection["project"] {
  return {
    id: "p1",
    name: "Migration M365",
    status: "on_track",
    method: "predictive",
    criticality: "high",
    ...overrides,
  };
}

describe("buildProjectContextRows (UX-5.4, rail contextuel)", () => {
  it("affiche 'Non renseigné' quand sponsor/chef de projet sont absents", () => {
    const rows = buildProjectContextRows(project());
    expect(rows.find((r) => r.label === "Chef de projet")?.value).toBe("Non renseigné");
    expect(rows.find((r) => r.label === "Sponsor")?.value).toBe("Non renseigné");
  });

  it("traite une valeur vide/blanche comme absente (correctif review Codex)", () => {
    const rows = buildProjectContextRows(project({ projectManager: "   ", sponsor: "" }));
    expect(rows.find((r) => r.label === "Chef de projet")?.value).toBe("Non renseigné");
    expect(rows.find((r) => r.label === "Sponsor")?.value).toBe("Non renseigné");
  });

  it("affiche les valeurs réelles quand présentes", () => {
    const rows = buildProjectContextRows(project({ projectManager: "Koffi N.", sponsor: "Direction IT" }));
    expect(rows.find((r) => r.label === "Chef de projet")?.value).toBe("Koffi N.");
    expect(rows.find((r) => r.label === "Sponsor")?.value).toBe("Direction IT");
  });

  it("masque les lignes de date absentes plutôt que d'afficher un tiret", () => {
    const rows = buildProjectContextRows(project());
    expect(rows.find((r) => r.label === "Date cible")).toBeUndefined();
    expect(rows.find((r) => r.label === "Prévision")).toBeUndefined();
  });

  it("affiche targetDate et forecastDate formatées quand présentes et différentes", () => {
    const rows = buildProjectContextRows(
      project({ targetDate: "2026-12-01T00:00:00.000Z", forecastDate: "2027-01-15T00:00:00.000Z" })
    );
    const target = rows.find((r) => r.label === "Date cible")?.value;
    const forecast = rows.find((r) => r.label === "Prévision")?.value;
    expect(target).toBeTruthy();
    expect(forecast).toBeTruthy();
    expect(target).not.toBe(forecast);
    expect(target).not.toMatch(/T00:00:00/);
  });

  it("traduit méthode/statut/criticité en libellés lisibles, jamais l'enum brut", () => {
    const rows = buildProjectContextRows(project({ method: "agile", status: "at_risk", criticality: "critical" }));
    expect(rows.find((r) => r.label === "Méthode")?.value).toBe("Agile");
    expect(rows.find((r) => r.label === "Statut")?.value).toBe("À risque");
    expect(rows.find((r) => r.label === "Criticité")?.value).toBe("Critique");
    const values = rows.map((r) => r.value);
    expect(values).not.toContain("agile");
    expect(values).not.toContain("at_risk");
    expect(values).not.toContain("critical");
  });

  it("marque Statut/Criticité comme masquées en mode compact (déjà visibles dans le header)", () => {
    const rows = buildProjectContextRows(project());
    expect(rows.find((r) => r.label === "Statut")?.hideInCompact).toBe(true);
    expect(rows.find((r) => r.label === "Criticité")?.hideInCompact).toBe(true);
    expect(rows.find((r) => r.label === "Chef de projet")?.hideInCompact).toBeUndefined();
  });
});

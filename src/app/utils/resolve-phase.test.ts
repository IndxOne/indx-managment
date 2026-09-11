import { describe, expect, it } from "vitest";
import { resolveDisplayPhaseId } from "./resolve-phase";

const SIMPLE_PHASES = ["preparation", "realisation", "verification", "cloture"];
const AMOA_PHASES = ["cadrage", "conception", "realisation", "deploiement"];

describe("resolveDisplayPhaseId", () => {
  it("retourne la phase telle quelle si elle appartient au template courant", () => {
    expect(resolveDisplayPhaseId("realisation", SIMPLE_PHASES)).toBe("realisation");
  });

  it("retourne la première phase si l'action n'a aucun phaseId", () => {
    expect(resolveDisplayPhaseId(undefined, SIMPLE_PHASES)).toBe("preparation");
  });

  it("remappe les anciennes phases du preset simple (Lot 6) vers leur équivalent", () => {
    expect(resolveDisplayPhaseId("a_traiter", SIMPLE_PHASES)).toBe("preparation");
    expect(resolveDisplayPhaseId("en_cours", SIMPLE_PHASES)).toBe("realisation");
    expect(resolveDisplayPhaseId("en_attente", SIMPLE_PHASES)).toBe("realisation");
    expect(resolveDisplayPhaseId("termine", SIMPLE_PHASES)).toBe("cloture");
  });

  it("remappe les anciennes phases AMOA (6 colonnes) vers le tableau à 4 colonnes", () => {
    expect(resolveDisplayPhaseId("ateliers", AMOA_PHASES)).toBe("conception");
    expect(resolveDisplayPhaseId("realisations", AMOA_PHASES)).toBe("realisation");
    expect(resolveDisplayPhaseId("validations", AMOA_PHASES)).toBe("deploiement");
    expect(resolveDisplayPhaseId("restitutions", AMOA_PHASES)).toBe("deploiement");
    expect(resolveDisplayPhaseId("cloture", AMOA_PHASES)).toBe("deploiement");
  });

  it("« cloture » reste une phase à part entière pour le preset simple (pas de collision avec l'alias AMOA)", () => {
    expect(resolveDisplayPhaseId("cloture", SIMPLE_PHASES)).toBe("cloture");
  });

  it("retombe sur la première phase pour un phaseId totalement inconnu (jamais de cul-de-sac)", () => {
    expect(resolveDisplayPhaseId("un-id-jamais-vu", SIMPLE_PHASES)).toBe("preparation");
  });
});

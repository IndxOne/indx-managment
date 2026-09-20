import { describe, expect, it } from "vitest";
import { criticalityToTone, projectStatusToTone, severityToTone } from "./tone";

describe("severityToTone", () => {
  it("mappe chaque sévérité vers sa tonalité", () => {
    expect(severityToTone("blocking")).toBe("critical");
    expect(severityToTone("warning")).toBe("attention");
    expect(severityToTone("info")).toBe("neutral");
  });
});

describe("projectStatusToTone", () => {
  it("mappe chaque statut projet vers sa tonalité", () => {
    expect(projectStatusToTone("on_track")).toBe("positive");
    expect(projectStatusToTone("at_risk")).toBe("attention");
    expect(projectStatusToTone("off_track")).toBe("critical");
    expect(projectStatusToTone("closed")).toBe("neutral");
  });
});

describe("criticalityToTone", () => {
  it("mappe chaque criticité vers sa tonalité", () => {
    expect(criticalityToTone("low")).toBe("neutral");
    expect(criticalityToTone("medium")).toBe("attention");
    expect(criticalityToTone("high")).toBe("critical");
    expect(criticalityToTone("critical")).toBe("critical");
  });
});

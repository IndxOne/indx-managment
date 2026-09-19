import { describe, expect, it } from "vitest";
import {
  canTransitionChangeRequest,
  canTransitionDecision,
  canTransitionIssue,
  canTransitionMilestone,
  canTransitionRisk,
  canTransitionWorkItem,
} from "./state-machines";

describe("canTransitionDecision", () => {
  it("chemin linéaire complet autorisé", () => {
    expect(canTransitionDecision("to_prepare", "ready")).toBe(true);
    expect(canTransitionDecision("ready", "decided")).toBe(true);
    expect(canTransitionDecision("decided", "applied")).toBe(true);
    expect(canTransitionDecision("applied", "verified")).toBe(true);
  });

  it("aucun saut d'étape", () => {
    expect(canTransitionDecision("to_prepare", "decided")).toBe(false);
    expect(canTransitionDecision("ready", "applied")).toBe(false);
    expect(canTransitionDecision("verified", "to_prepare")).toBe(false);
  });
});

describe("canTransitionIssue", () => {
  it("open peut aller vers in_progress ou escalated", () => {
    expect(canTransitionIssue("open", "in_progress")).toBe(true);
    expect(canTransitionIssue("open", "escalated")).toBe(true);
  });

  it("resolved est un état terminal", () => {
    expect(canTransitionIssue("resolved", "open")).toBe(false);
    expect(canTransitionIssue("resolved", "in_progress")).toBe(false);
  });
});

describe("canTransitionMilestone", () => {
  it("planned -> ready_for_review -> accepted/refused", () => {
    expect(canTransitionMilestone("planned", "ready_for_review")).toBe(true);
    expect(canTransitionMilestone("ready_for_review", "accepted")).toBe(true);
    expect(canTransitionMilestone("ready_for_review", "refused")).toBe(true);
  });

  it("accepted est terminal", () => {
    expect(canTransitionMilestone("accepted", "ready_for_review")).toBe(false);
  });

  it("refused n'autorise plus de transition générique (resubmitMilestone() requis)", () => {
    expect(canTransitionMilestone("refused", "ready_for_review")).toBe(false);
    expect(canTransitionMilestone("refused", "accepted")).toBe(false);
  });

  it("planned ne saute jamais directement à accepted", () => {
    expect(canTransitionMilestone("planned", "accepted")).toBe(false);
  });
});

describe("canTransitionRisk", () => {
  it("chemin séquentiel complet", () => {
    expect(canTransitionRisk("identified", "qualified")).toBe(true);
    expect(canTransitionRisk("qualified", "response_planned")).toBe(true);
    expect(canTransitionRisk("response_planned", "under_control")).toBe(true);
    expect(canTransitionRisk("under_control", "closed")).toBe(true);
  });

  it("closed est terminal", () => {
    expect(canTransitionRisk("closed", "under_control")).toBe(false);
  });
});

describe("canTransitionChangeRequest", () => {
  it("submitted -> under_analysis -> decided -> applied|rejected", () => {
    expect(canTransitionChangeRequest("submitted", "under_analysis")).toBe(true);
    expect(canTransitionChangeRequest("under_analysis", "decided")).toBe(true);
    expect(canTransitionChangeRequest("decided", "applied")).toBe(true);
    expect(canTransitionChangeRequest("decided", "rejected")).toBe(true);
  });

  it("applied et rejected sont terminaux", () => {
    expect(canTransitionChangeRequest("applied", "decided")).toBe(false);
    expect(canTransitionChangeRequest("rejected", "decided")).toBe(false);
  });
});

describe("canTransitionWorkItem — états terminaux", () => {
  it("done et cancelled n'ont aucune sortie", () => {
    expect(canTransitionWorkItem("done", "in_progress")).toBe(false);
    expect(canTransitionWorkItem("cancelled", "to_scope")).toBe(false);
  });

  it("cancelled est atteignable depuis tout état non terminal", () => {
    expect(canTransitionWorkItem("to_scope", "cancelled")).toBe(true);
    expect(canTransitionWorkItem("ready", "cancelled")).toBe(true);
    expect(canTransitionWorkItem("in_progress", "cancelled")).toBe(true);
    expect(canTransitionWorkItem("blocked", "cancelled")).toBe(true);
    expect(canTransitionWorkItem("waiting_external", "cancelled")).toBe(true);
  });
});

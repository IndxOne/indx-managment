import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi, beforeEach } from "vitest";
import type { ProjectOverviewProjection } from "../../domain/v3/project-overview/types";
import { resetAuthStateForTests } from "../hooks/useAuthState";
import { ProjectV3Screen } from "./ProjectV3Screen";

vi.mock("../adapters/supabase/client", () => ({
  getSupabaseClient: () => ({}),
  isSupabaseConfigured: () => true,
}));

/** Authentifié par défaut (hotfix 401 V3, cf. useAuthState.ts) — les tests
 * dédiés surchargent `getCurrentAuthUserIdMock` localement. */
const getCurrentAuthUserIdMock = vi.fn(async (): Promise<string | null> => "test-auth-user");
vi.mock("../adapters/supabase/auth", () => ({
  getCurrentAuthUserId: () => getCurrentAuthUserIdMock(),
  onAuthStateChange: () => () => {},
}));

const readProjectOverviewMock = vi.fn();
vi.mock("../../infrastructure/persistence/v3/repositories/project-overview-reader", () => ({
  readProjectOverview: (...args: unknown[]) => readProjectOverviewMock(...args),
}));

function emptyOverview(overrides: Partial<ProjectOverviewProjection> = {}): ProjectOverviewProjection {
  return {
    project: {
      id: "p1",
      name: "Migration M365",
      status: "on_track",
      method: "predictive",
      criticality: "high",
    },
    objectives: [],
    milestones: [],
    workItems: [],
    decisions: [],
    risks: [],
    issues: [],
    summary: {
      activeObjectivesCount: 0,
      openWorkItemsCount: 0,
      highCriticalRisksCount: 0,
      pendingDecisionsCount: 0,
      openIssuesCount: 0,
    },
    watchItems: [],
    recentChanges: [],
    ...overrides,
  };
}

const focusItemFixture = {
  id: "work_item:w1",
  sourceType: "work_item" as const,
  sourceId: "w1",
  projectId: "p1",
  severity: "blocking" as const,
  title: "Configurer VPN",
  reason: "Aucun responsable assigné.",
  status: "ready",
};

beforeEach(() => {
  resetAuthStateForTests();
  getCurrentAuthUserIdMock.mockReset().mockResolvedValue("test-auth-user");
  readProjectOverviewMock.mockReset();
});
afterEach(() => {
  resetAuthStateForTests();
});

describe("ProjectV3Screen — états", () => {
  it("loading avant résolution", () => {
    readProjectOverviewMock.mockReturnValue(new Promise(() => {}));
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    expect(screen.getByText("Chargement du projet…")).toBeInTheDocument();
  });

  it("erreur technique : message utilisateur déterministe, jamais PersistenceError.message brut", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: false,
      error: { kind: "persistence", code: "unknown", message: "duplicate key value violates constraint xyz_pkey" },
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    expect(await screen.findByText("Impossible de charger ce projet.")).toBeInTheDocument();
    expect(screen.queryByText(/xyz_pkey/)).not.toBeInTheDocument();
  });

  it("projet not_found : message dédié", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: false,
      error: { kind: "persistence", code: "not_found", message: "Project p1 introuvable ou inaccessible." },
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    expect(await screen.findByText("Projet indisponible ou inaccessible.")).toBeInTheDocument();
  });

  it("retry relance readProjectOverview", async () => {
    const user = userEvent.setup();
    readProjectOverviewMock.mockResolvedValueOnce({ ok: false, error: { kind: "persistence", code: "unknown", message: "x" } });
    readProjectOverviewMock.mockResolvedValueOnce({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Impossible de charger ce projet.");
    await user.click(screen.getByRole("button", { name: "Réessayer" }));
    await waitFor(() => expect(readProjectOverviewMock).toHaveBeenCalledTimes(2));
  });
});

describe("ProjectV3Screen — UX-5.1 shell (Focus maintenant / Ensuite)", () => {
  it("Focus maintenant affiche l'élément le plus prioritaire de la projection", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview({ focusItem: focusItemFixture }) });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByText("Configurer VPN")).toBeInTheDocument();
    expect(screen.getByText("Aucun responsable assigné.")).toBeInTheDocument();
  });

  it("aucun focusItem : état positif compact, aucune erreur", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByText("Rien de critique à traiter maintenant.")).toBeInTheDocument();
  });

  it("Ensuite affiche le prochain jalon quand présent", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        summary: {
          activeObjectivesCount: 0,
          openWorkItemsCount: 0,
          highCriticalRisksCount: 0,
          pendingDecisionsCount: 0,
          openIssuesCount: 0,
          nextMilestone: { id: "m1", observableResult: "Design validé", targetDate: "2026-12-01T00:00:00.000Z" },
        },
      }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByText("Design validé")).toBeInTheDocument();
  });

  it("Ensuite affiche le statut du jalon (ex. refused, correctif review Codex)", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        summary: {
          activeObjectivesCount: 0,
          openWorkItemsCount: 0,
          highCriticalRisksCount: 0,
          pendingDecisionsCount: 0,
          openIssuesCount: 0,
          nextMilestone: { id: "m1", observableResult: "Design validé", targetDate: "2026-12-01T00:00:00.000Z", status: "refused" },
        },
      }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByText(/refused/)).toBeInTheDocument();
  });

  it("Focus maintenant : le CTA « Voir dans Mon Brief » est explicite et distinct de la carte", async () => {
    const user = userEvent.setup();
    const onOpenBrief = vi.fn();
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview({ focusItem: focusItemFixture }) });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={onOpenBrief} onOpenAuth={() => {}} />);
    await screen.findByText("Configurer VPN");
    await user.click(screen.getByRole("button", { name: "Voir dans Mon Brief" }));
    expect(onOpenBrief).toHaveBeenCalledWith("p1");
  });

  it("aucun prochain jalon : état compact dédié", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByText("Aucun jalon planifié.")).toBeInTheDocument();
  });

  it("n'affiche plus ProjectSummaryGrid (6 KPI) dans UX-5.1", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.queryByText("Objectifs actifs")).not.toBeInTheDocument();
    expect(screen.queryByText("WorkItems ouverts")).not.toBeInTheDocument();
  });

  it("n'affiche plus les 6 sections détaillées en permanence (UX-5.2 : Explorer remplace, un panneau à la fois)", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        objectives: [{ id: "o1", statement: "Migrer 100% des boîtes mail", status: "active", hasOwner: false }],
        milestones: [
          { id: "m1", observableResult: "Design validé", status: "planned", targetDate: "2026-12-01T00:00:00.000Z", needsAttention: false },
        ],
      }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    // Les chips de catégorie (Explorer) sont autorisées, mais aucun contenu
    // détaillé n'est visible tant qu'aucune catégorie n'est sélectionnée —
    // jamais 6 sections permanentes comme avant UX-5.1.
    expect(screen.getByRole("tab", { name: /Objectifs/ })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Jalons/ })).toBeInTheDocument();
    expect(screen.queryByText("Migrer 100% des boîtes mail")).not.toBeInTheDocument();
    expect(screen.queryByText("Design validé")).not.toBeInTheDocument();
  });

  it("rendu mobile : shell en une colonne, aucune largeur fixe en px", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview({ focusItem: focusItemFixture }) });
    const { container } = render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(container.querySelector(".project-pilot-shell")).toBeInTheDocument();
    expect(container.innerHTML).not.toMatch(/width:\s*\d+px/);
  });
});

describe("ProjectV3Screen — deep-link (focusType/focusId, §7)", () => {
  it("cible le focus affiché : mis en évidence sur place, sans erreur", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview({ focusItem: focusItemFixture }) });
    render(
      <ProjectV3Screen projectId="p1" focusType="work_item" focusId="w1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />
    );
    await screen.findByText("Configurer VPN");
    const card = screen.getByText("Configurer VPN").closest("[data-focused]");
    expect(card).toHaveAttribute("data-focused", "true");
  });

  it("cible une entité dans une catégorie vide (Explorer) : aucune erreur, navigation non cassée", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(
      <ProjectV3Screen projectId="p1" focusType="risk" focusId="disparu" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />
    );
    await screen.findByText("Migration M365");
    expect(screen.queryByText(/erreur/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("focusType Dependency (non exposé dans Explorer) : aucune erreur, aucune catégorie présélectionnée", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({ workItems: [{ id: "w1", title: "Configurer VPN", status: "ready", priority: "normal", needsAttention: false }] }),
    });
    render(
      <ProjectV3Screen
        projectId="p1"
        focusType="dependency"
        focusId="dep1"
        onBack={() => {}}
        onOpenBrief={() => {}}
        onOpenAuth={() => {}}
      />
    );
    await screen.findByText("Migration M365");
    expect(screen.queryByText(/erreur/i)).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Actions/ })).toHaveAttribute("aria-selected", "false");
    // La donnée reste accessible via Explorer/Mon Brief même sans présélection.
    expect(screen.getByRole("tab", { name: /Actions/ })).toBeInTheDocument();
  });
});

describe("ProjectV3Screen — UX-5.2 : À surveiller", () => {
  const watchItemsFixture = [
    {
      id: "decision:d1",
      sourceType: "decision" as const,
      sourceId: "d1",
      projectId: "p1",
      severity: "warning" as const,
      title: "Quel fournisseur ERP retenir ?",
      reason: "Aucun décideur désigné.",
      status: "to_prepare",
    },
    {
      id: "dependency:dep1",
      sourceType: "dependency" as const,
      sourceId: "dep1",
      projectId: "p1",
      severity: "warning" as const,
      title: "Dépendance (blocks)",
      reason: "En retard.",
      status: "delayed",
    },
  ];

  it("affiche les éléments de watchItems (le focus n'y figure jamais, exclu en amont par la projection)", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({ focusItem: focusItemFixture, watchItems: watchItemsFixture }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByRole("heading", { name: "À surveiller" })).toBeInTheDocument();
    expect(screen.getByText("Quel fournisseur ERP retenir ?")).toBeInTheDocument();
    // Dependency couvert (correctif P1 review, réutilisé tel quel ici).
    expect(screen.getByText("Dépendance (blocks)")).toBeInTheDocument();
  });

  it("watchItems vide : la zone « À surveiller » est masquée entièrement", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview({ watchItems: [] }) });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.queryByText("À surveiller")).not.toBeInTheDocument();
  });

  it("« Voir tout dans Mon Brief » appelle onOpenBrief(projectId)", async () => {
    const user = userEvent.setup();
    const onOpenBrief = vi.fn();
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview({ watchItems: watchItemsFixture }) });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={onOpenBrief} onOpenAuth={() => {}} />);
    await screen.findByRole("heading", { name: "À surveiller" });
    await user.click(screen.getByRole("button", { name: "Voir tout dans Mon Brief" }));
    expect(onOpenBrief).toHaveBeenCalledWith("p1");
  });
});

describe("ProjectV3Screen — UX-5.2 : Explorer", () => {
  function overviewWithCategories() {
    return emptyOverview({
      objectives: [{ id: "o1", statement: "Migrer 100% des boîtes mail", status: "active", hasOwner: false }],
      workItems: [
        { id: "w1", title: "Configurer VPN", status: "ready", priority: "normal", needsAttention: false },
        { id: "w2", title: "Former les équipes", status: "in_progress", priority: "normal", needsAttention: false },
      ],
      decisions: [],
    });
  }

  it("affiche un compteur exact par catégorie, aucun contenu détaillé avant sélection", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: overviewWithCategories() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByRole("tab", { name: "Objectifs 1" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Actions 2" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Décisions 0" })).toBeInTheDocument();
    expect(screen.queryByText("Configurer VPN")).not.toBeInTheDocument();
  });

  it("une seule catégorie affichée à la fois : changer de catégorie masque la précédente", async () => {
    const user = userEvent.setup();
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: overviewWithCategories() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");

    await user.click(screen.getByRole("tab", { name: "Objectifs 1" }));
    expect(screen.getByText("Migrer 100% des boîtes mail")).toBeInTheDocument();
    expect(screen.queryByText("Configurer VPN")).not.toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "Actions 2" }));
    expect(screen.getByText("Configurer VPN")).toBeInTheDocument();
    expect(screen.queryByText("Migrer 100% des boîtes mail")).not.toBeInTheDocument();
  });

  it("catégorie vide sélectionnée : message dédié, pas d'erreur", async () => {
    const user = userEvent.setup();
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: overviewWithCategories() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    await user.click(screen.getByRole("tab", { name: "Décisions 0" }));
    expect(screen.getByText("Aucun élément dans cette catégorie.")).toBeInTheDocument();
  });

  it("aucune donnée dans aucune catégorie : état compact dédié", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByText("Rien à explorer pour l'instant.")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("deep-link focusType=work_item : catégorie Actions présélectionnée et item mis en évidence", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: overviewWithCategories() });
    render(
      <ProjectV3Screen projectId="p1" focusType="work_item" focusId="w2" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />
    );
    await screen.findByText("Migration M365");
    expect(screen.getByRole("tab", { name: "Actions 2" })).toHaveAttribute("aria-selected", "true");
    const card = screen.getByText("Former les équipes").closest("[data-focused]");
    expect(card).toHaveAttribute("data-focused", "true");
  });

  it("deep-link focusType=decision : catégorie Décisions présélectionnée", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        decisions: [{ id: "d1", question: "Quel ERP ?", status: "to_prepare", hasDecider: false, needsAttention: false }],
      }),
    });
    render(
      <ProjectV3Screen projectId="p1" focusType="decision" focusId="d1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />
    );
    await screen.findByText("Migration M365");
    expect(screen.getByRole("tab", { name: /Décisions/ })).toHaveAttribute("aria-selected", "true");
  });

  it("deep-link focusType=risk : catégorie Risques présélectionnée", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({ risks: [{ id: "r1", event: "Départ du sponsor", status: "identified", hasOwner: false, needsAttention: false }] }),
    });
    render(<ProjectV3Screen projectId="p1" focusType="risk" focusId="r1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByRole("tab", { name: /Risques/ })).toHaveAttribute("aria-selected", "true");
  });

  it("deep-link focusType=issue : catégorie Issues présélectionnée", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        issues: [{ id: "i1", problem: "Accès VPN indisponible", status: "open", hasResolver: false, needsAttention: false }],
      }),
    });
    render(<ProjectV3Screen projectId="p1" focusType="issue" focusId="i1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByRole("tab", { name: /Issues/ })).toHaveAttribute("aria-selected", "true");
  });

  it("deep-link focusType=milestone : catégorie Jalons présélectionnée", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        milestones: [
          { id: "m1", observableResult: "Design validé", status: "planned", targetDate: "2026-12-01T00:00:00.000Z", needsAttention: false },
        ],
      }),
    });
    render(
      <ProjectV3Screen projectId="p1" focusType="milestone" focusId="m1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />
    );
    await screen.findByText("Migration M365");
    expect(screen.getByRole("tab", { name: /Jalons/ })).toHaveAttribute("aria-selected", "true");
  });

  it("re-cliquer une catégorie déjà sélectionnée la laisse ouverte (correctif review Codex : sémantique tab, pas de désélection)", async () => {
    const user = userEvent.setup();
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        objectives: [{ id: "o1", statement: "Migrer 100% des boîtes mail", status: "active", hasOwner: false }],
      }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    const chip = screen.getByRole("tab", { name: "Objectifs 1" });
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-selected", "true");
    await user.click(chip);
    expect(chip).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Migrer 100% des boîtes mail")).toBeInTheDocument();
  });

  it("cible déjà visible dans Maintenant : Explorer la présélectionne sans faire défiler vers son doublon (correctif review Codex)", async () => {
    const originalScrollIntoView = Element.prototype.scrollIntoView;
    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;
    try {
      readProjectOverviewMock.mockResolvedValue({
        ok: true,
        value: emptyOverview({
          focusItem: focusItemFixture,
          workItems: [{ id: "w1", title: "Configurer VPN", status: "blocked", priority: "high", needsAttention: true, reason: "Bloqué." }],
        }),
      });
      render(
        <ProjectV3Screen projectId="p1" focusType="work_item" focusId="w1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />
      );
      await screen.findByText("Migration M365");
      expect(screen.getByRole("tab", { name: "Actions 1" })).toHaveAttribute("aria-selected", "true");
      expect(scrollIntoViewMock).not.toHaveBeenCalled();
    } finally {
      Element.prototype.scrollIntoView = originalScrollIntoView;
    }
  });
});

describe("ProjectV3Screen — UX-5.3 : Changé récemment", () => {
  const recentChangesFixture = [
    { id: "d1", sourceType: "decision" as const, title: "Quel fournisseur ERP retenir ?", updatedAt: "2026-09-19T08:00:00.000Z" },
    { id: "o1", sourceType: "objective" as const, title: "Migrer 100% des boîtes mail", updatedAt: "2026-09-18T08:00:00.000Z" },
  ];

  it("affiche le type, le titre métier et une date courte — jamais un id technique ou updated_at brut", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview({ recentChanges: recentChangesFixture }) });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByRole("heading", { name: "Changé récemment" })).toBeInTheDocument();
    expect(screen.getByText("Quel fournisseur ERP retenir ?")).toBeInTheDocument();
    expect(screen.getByText("Migrer 100% des boîtes mail")).toBeInTheDocument();
    expect(screen.queryByText("d1")).not.toBeInTheDocument();
    expect(screen.queryByText(/updated_at/)).not.toBeInTheDocument();
  });

  it("recentChanges vide : le bloc est masqué entièrement, aucun espace réservé", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview({ recentChanges: [] }) });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.queryByText("Changé récemment")).not.toBeInTheDocument();
  });

  it("clic sur un changement WorkItem : présélectionne la catégorie Actions et surligne l'élément", async () => {
    const user = userEvent.setup();
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        recentChanges: [{ id: "w1", sourceType: "work_item" as const, title: "Configurer VPN", updatedAt: "2026-09-19T08:00:00.000Z" }],
        workItems: [{ id: "w1", title: "Configurer VPN", status: "ready", priority: "normal", needsAttention: false }],
      }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    await user.click(screen.getAllByText("Configurer VPN")[0]!);
    expect(screen.getByRole("tab", { name: "Actions 1" })).toHaveAttribute("aria-selected", "true");
    const card = screen.getAllByText("Configurer VPN")[1]?.closest("[data-focused]");
    expect(card).toHaveAttribute("data-focused", "true");
  });

  it("clic sur un changement Objective (jamais couvert par Mon Brief) : présélectionne la catégorie Objectifs", async () => {
    const user = userEvent.setup();
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({
        recentChanges: [{ id: "o1", sourceType: "objective" as const, title: "Migrer 100% des boîtes mail", updatedAt: "2026-09-19T08:00:00.000Z" }],
        objectives: [{ id: "o1", statement: "Migrer 100% des boîtes mail", status: "active", hasOwner: false }],
      }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    await user.click(screen.getByText("Migrer 100% des boîtes mail"));
    expect(screen.getByRole("tab", { name: "Objectifs 1" })).toHaveAttribute("aria-selected", "true");
  });

  it("aucune régression Maintenant/Ensuite/À surveiller/Explorer avec recentChanges rempli", async () => {
    readProjectOverviewMock.mockResolvedValue({
      ok: true,
      value: emptyOverview({ focusItem: focusItemFixture, recentChanges: recentChangesFixture }),
    });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    expect(screen.getByText("Configurer VPN")).toBeInTheDocument();
    expect(screen.getByText("Aucun jalon planifié.")).toBeInTheDocument();
    expect(screen.getByText("Rien à explorer pour l'instant.")).toBeInTheDocument();
  });
});

describe("ProjectV3Screen — navigation", () => {
  it("« Mon Brief de ce projet » appelle onOpenBrief(projectId)", async () => {
    const user = userEvent.setup();
    const onOpenBrief = vi.fn();
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={onOpenBrief} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    await user.click(screen.getByRole("button", { name: "Mon Brief de ce projet" }));
    expect(onOpenBrief).toHaveBeenCalledWith("p1");
  });

  it("Retour appelle onBack", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={onBack} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await screen.findByText("Migration M365");
    await user.click(screen.getByRole("button", { name: "Retour" }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe("ProjectV3Screen — hotfix 401 : session Auth requise avant toute lecture V3", () => {
  it("sans session : 0 lecture réseau V3, CTA Se connecter", async () => {
    getCurrentAuthUserIdMock.mockResolvedValue(null);
    const onOpenAuth = vi.fn();
    const user = userEvent.setup();
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={onOpenAuth} />);

    expect(await screen.findByText("Connexion requise")).toBeInTheDocument();
    expect(readProjectOverviewMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Se connecter" }));
    expect(onOpenAuth).toHaveBeenCalledTimes(1);
  });

  it("authentifié : readProjectOverview s'exécute normalement", async () => {
    readProjectOverviewMock.mockResolvedValue({ ok: true, value: emptyOverview() });
    render(<ProjectV3Screen projectId="p1" onBack={() => {}} onOpenBrief={() => {}} onOpenAuth={() => {}} />);
    await waitFor(() => expect(readProjectOverviewMock).toHaveBeenCalledTimes(1));
  });
});

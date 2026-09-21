import { useEffect, useState } from "react";
import type { BriefItem, BriefProjection } from "../../domain/v3/brief/types";
import { readBrief } from "../../infrastructure/persistence/v3/repositories/brief-reader";
import type { PersistenceError } from "../../infrastructure/persistence/v3/errors";
import { getSupabaseClient } from "../adapters/supabase/client";
import { useAuthState } from "../hooks/useAuthState";
import { BriefSummary } from "../components/brief/BriefSummary";
import { BriefFilters } from "../components/brief/BriefFilters";
import { BriefSection } from "../components/brief/BriefSection";
import { BriefEmptyState } from "../components/brief/BriefEmptyState";
import { BriefErrorState } from "../components/brief/BriefErrorState";
import { IconChevronRight } from "../components/Icons";
import { AuthRequiredState, LoadingState } from "../components/StateBlocks";
import { BRIEF_FILTERS, type BriefFilterId } from "../utils/brief-labels";

type BriefLoadState =
  | { status: "loading" }
  | { status: "error"; error: PersistenceError }
  /** Hotfix production (401 V3) : Supabase configuré mais aucune session Auth. */
  | { status: "unauthenticated" }
  | { status: "ready"; brief: BriefProjection };

/**
 * Écran Mon Brief (Lot 3 UI) — affiche exclusivement ce que BriefProjection
 * fournit : aucune règle, aucun tri, aucun compteur recalculé ici. `now`
 * est produit une seule fois par appel, au point d'entrée applicatif (le
 * domaine et l'infrastructure restent purs, jamais de Date.now() en dessous
 * de cette frontière).
 */
export function BriefScreen({
  projectId,
  projectName,
  onBack,
  onOpenItem,
  onOpenAuth,
}: {
  projectId: string;
  /** Fourni par l'écran appelant (déjà en contexte) — jamais une requête
   * supplémentaire ici uniquement pour le nom (décision de gate §5). */
  projectName?: string;
  onBack: () => void;
  /** Absent = cartes non interactives (décision de gate §6). */
  onOpenItem?: (item: BriefItem) => void;
  /** Hotfix production (401 V3) : ouvre l'écran Connexion tant que non
   * authentifié — nécessaire car cet écran est aussi atteignable en direct
   * (route "brief" avec projectId), pas seulement via BriefLauncherScreen. */
  onOpenAuth: () => void;
}) {
  const auth = useAuthState();
  const [state, setState] = useState<BriefLoadState>({ status: "loading" });
  const [activeFilter, setActiveFilter] = useState<BriefFilterId>("all");
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (auth.status === "loading") {
      setState({ status: "loading" });
      return;
    }
    if (auth.status === "unauthenticated") {
      setState({ status: "unauthenticated" });
      return;
    }
    let cancelled = false;
    setState({ status: "loading" });
    const client = getSupabaseClient();
    const now = new Date().toISOString();
    readBrief(client, projectId, now).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setState({ status: "ready", brief: result.value });
      } else {
        // Détail technique en console pour le diagnostic — jamais à
        // l'écran (aucun mécanisme de logs applicatif dédié à réutiliser).
        console.error("readBrief a échoué", result.error);
        setState({ status: "error", error: result.error });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [auth.status, projectId, reloadToken]);

  return (
    <div>
      <div className="top-bar">
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <button type="button" className="btn btn-icon" onClick={onBack} aria-label="Retour">
            <IconChevronRight width={18} height={18} style={{ transform: "rotate(180deg)" }} />
          </button>
          <h1 className="project-title">{projectName ?? "Mon Brief"}</h1>
        </div>
      </div>
      <div className="app-main">
        {state.status === "loading" && <LoadingState label="Chargement de Mon Brief…" />}
        {state.status === "error" && (
          <BriefErrorState error={state.error} onRetry={() => setReloadToken((token) => token + 1)} />
        )}
        {state.status === "unauthenticated" && (
          <AuthRequiredState description="Connecte-toi pour voir Mon Brief." onOpenAuth={onOpenAuth} />
        )}
        {state.status === "ready" && (
          <BriefContent
            brief={state.brief}
            activeFilter={activeFilter}
            onFilterChange={setActiveFilter}
            onOpenItem={onOpenItem}
            onBack={onBack}
          />
        )}
      </div>
    </div>
  );
}

function BriefContent({
  brief,
  activeFilter,
  onFilterChange,
  onOpenItem,
  onBack,
}: {
  brief: BriefProjection;
  activeFilter: BriefFilterId;
  onFilterChange: (id: BriefFilterId) => void;
  onOpenItem?: (item: BriefItem) => void;
  onBack: () => void;
}) {
  if (brief.attentionItems.length === 0) {
    return <BriefEmptyState onBackToProject={onBack} />;
  }

  const activeFilterDef = BRIEF_FILTERS.find((filter) => filter.id === activeFilter) ?? BRIEF_FILTERS[0]!;
  const items = activeFilterDef.select(brief);

  return (
    <>
      <BriefSummary summary={brief.summary} />
      <BriefFilters active={activeFilter} onChange={onFilterChange} />
      {items.length > 0 ? (
        <BriefSection title={activeFilterDef.label} items={items} onOpenItem={onOpenItem} />
      ) : (
        <p className="brief-filter-empty">Aucun élément pour ce filtre.</p>
      )}
    </>
  );
}

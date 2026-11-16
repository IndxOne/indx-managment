import type { WorkItemOverviewItem } from "../../../domain/v3/project-overview/types";
import { SeverityBadge } from "../SeverityBadge";
import { IconChevronRight } from "../Icons";
import { PRIORITY_LABELS, WORK_STATUS_LABELS, formatDay, label, workStatusTone } from "./labels";

/** Action V2.2 — consultation seule d'un work item V3 (arbitrage GO 16/11) : aucune mutation,
 * aucun bouton inopérant. Champs limités à ceux de la projection (pas de responsable/notes). */
export function V22Action({ item, projectName, onBack }: { item: WorkItemOverviewItem; projectName: string; onBack: () => void }) {
  return (
    <div className="v22-action-view">
      <button type="button" className="v22-back tap-target" onClick={onBack}>
        <IconChevronRight width={16} height={16} style={{ transform: "rotate(180deg)" }} aria-hidden="true" /> Retour au projet
      </button>
      <p className="v22-eyebrow">Action · {projectName} · consultation</p>
      <h1 className="v22-h1">{item.title}</h1>
      <div className="v22-badges">
        <SeverityBadge tone={workStatusTone(item.status)} label={label(WORK_STATUS_LABELS, item.status)} />
        <SeverityBadge tone="neutral" label={label(PRIORITY_LABELS, item.priority)} />
      </div>
      <dl className="v22-card v22-facts">
        <div>
          <dt>Statut</dt>
          <dd>{label(WORK_STATUS_LABELS, item.status)}</dd>
        </div>
        <div>
          <dt>Priorité</dt>
          <dd>{label(PRIORITY_LABELS, item.priority)}</dd>
        </div>
        <div>
          <dt>Échéance</dt>
          <dd>{item.dueDate ? formatDay(item.dueDate) : "Non définie"}</dd>
        </div>
        {item.needsAttention && item.reason && (
          <div>
            <dt>Point d&apos;attention</dt>
            <dd>{item.reason}</dd>
          </div>
        )}
      </dl>
      <p className="v22-note">Consultation seule : l&apos;édition des actions de projet n&apos;est pas encore disponible. Les actions RUN restent modifiables.</p>
    </div>
  );
}

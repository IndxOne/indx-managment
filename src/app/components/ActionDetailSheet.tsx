import { useEffect, useRef, useState } from "react";
import type { Action, ActionStatus } from "../../domain/types";
import type { ActionContentEdit } from "../../domain/edit-action";
import type { Member } from "../../domain/member";
import type { MoveAxis, MoveDestination } from "../../domain/move-action";
import type { Workspace } from "../../domain/workspace";
import { ITEM_TYPE_LABELS, KIND_LABELS, PRIORITY_LABELS } from "../labels";
import { phaseLabel } from "../labels";
import { assigneesLabel } from "../utils/member-summary";
import { resolveDisplayPhaseId } from "../utils/resolve-phase";
import { scheduleSummary } from "../utils/schedule-summary";
import { EditActionSheet } from "./EditActionSheet";
import { MemberAssignSheet } from "./MemberAssignSheet";
import { MoveActionSheet } from "./MoveActionSheet";
import { NotesSheet } from "./NotesSheet";
import { LinkActionSheet } from "./LinkActionSheet";
import {
  IconArrowRight,
  IconBell,
  IconCalendar,
  IconCompass,
  IconLayers,
  IconLink,
  IconMessage,
  IconNotebook,
  IconPencil,
  IconTrash,
  IconUsers,
  StatusCheckIcon,
} from "./Icons";

const ACTIVITY_DATE_FORMAT = new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short" });

/**
 * Regroupe les 4 props liées à l'assignation (Lot 8B §K) — évite d'ajouter
 * 4 props individuelles de plus à un composant qui en a déjà beaucoup.
 * Absent = pas de ligne "Responsable" (mode Solo ou espace non-équipe),
 * comportement strictement inchangé.
 */
export interface ActionDetailCollaboration {
  members: Member[];
  assigneeIds: string[];
  onChangeAssignees: (assigneeIds: string[]) => void;
}

/**
 * Point d'entrée unique pour consulter/éditer une action existante (Lot 5) :
 * orchestre les sheets déjà existantes (édition, déplacement, notes, lien)
 * sans dupliquer leur logique. Mobile = plein écran, desktop = panneau
 * latéral avec le tableau visible derrière (fond translucide, pas opaque).
 */
export function ActionDetailSheet({
  action,
  phaseOptions,
  statusLabels,
  timezone,
  workspaces,
  actionsByWorkspace,
  onClose,
  onEdit,
  onMove,
  onSetReminder,
  onDisableReminder,
  onAddNote,
  onLink,
  onUnlink,
  onNavigate,
  onDelete,
  collaboration,
}: {
  action: Action;
  phaseOptions: string[];
  statusLabels: Record<ActionStatus, string>;
  timezone: string;
  workspaces: Workspace[];
  actionsByWorkspace: Record<string, Action[]>;
  onClose: () => void;
  onEdit: (edit: ActionContentEdit) => void;
  onMove: (destination: MoveDestination) => void;
  onSetReminder: (afterDays: number) => void;
  onDisableReminder: () => void;
  onAddNote: (text: string) => void;
  onLink: (linkedId: string) => void;
  onUnlink: () => void;
  /** Espace en mode Équipe (Lot 8B) : affiche la ligne "Responsable". Absent = pas de ligne, comportement inchangé (mode Solo). */
  collaboration?: ActionDetailCollaboration;
  onNavigate: (workspaceId: string) => void;
  onDelete: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [previouslyFocused] = useState<HTMLElement | null>(() => document.activeElement as HTMLElement | null);
  const [editing, setEditing] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [moveAxis, setMoveAxis] = useState<MoveAxis | "full" | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const subSheetOpen = editing || notesOpen || linkOpen || moveAxis !== null || assignOpen;
  const subSheetOpenRef = useRef(subSheetOpen);
  subSheetOpenRef.current = subSheetOpen;

  useEffect(() => {
    containerRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      // Une sous-sheet ouverte gère elle-même son Échap (BottomSheet) ; ne
      // pas fermer aussi le détail en dessous sur la même frappe.
      if (event.key === "Escape" && !subSheetOpenRef.current) onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose, previouslyFocused]);

  const noteCount = action.notes?.length ?? 0;
  const reminder = action.waitingReminder;
  const displayPhaseId = resolveDisplayPhaseId(action.phaseId, phaseOptions);
  const reminderActive = action.status === "waiting" && reminder?.enabled;
  const actionWorkspace = workspaces.find((candidate) => candidate.id === action.workspaceId);

  return (
    <>
      <div className="action-detail-backdrop" onClick={onClose} aria-hidden="true" />
      <div
        className="action-detail-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="action-detail-title"
        ref={containerRef}
        tabIndex={-1}
      >
        <div className="action-detail-header">
          <h2 id="action-detail-title" className="action-detail-title">
            {action.title}
          </h2>
          <button type="button" className="btn btn-icon tap-target" onClick={onClose} aria-label="Fermer le détail">
            ✕
          </button>
        </div>

        <div className="action-detail-body">
          <div className="choice-group" style={{ marginBottom: 8 }}>
            {actionWorkspace && (
              <DetailRow
                chipClass="phase-chip-gray"
                icon={<IconCompass width={18} height={18} />}
                label="Espace"
                value={`${actionWorkspace.name} · ${KIND_LABELS[actionWorkspace.kind]}`}
                onClick={() => {
                  onNavigate(actionWorkspace.id);
                  onClose();
                }}
              />
            )}
            <DetailRow
              chipClass="phase-chip-blue"
              icon={<StatusCheckIcon status={action.status} size={18} />}
              label="Statut"
              value={statusLabels[action.status]}
              onClick={() => setMoveAxis("status")}
            />
            <DetailRow
              chipClass="phase-chip-orange"
              icon={<IconPencil width={18} height={18} />}
              label="Priorité"
              value={PRIORITY_LABELS[action.priority]}
              onClick={() => setEditing(true)}
            />
            <DetailRow
              chipClass="phase-chip-purple"
              icon={<IconLayers width={18} height={18} />}
              label="Type"
              value={ITEM_TYPE_LABELS[action.itemType]}
              onClick={() => setEditing(true)}
            />
            <DetailRow
              chipClass="phase-chip-teal"
              icon={<IconCalendar width={18} height={18} />}
              label="Échéance"
              value={scheduleSummary(action.schedule)}
              onClick={() => setMoveAxis("schedule")}
            />
            {phaseOptions.length > 0 && (
              <DetailRow
                chipClass="phase-chip-gray"
                icon={<IconLayers width={18} height={18} />}
                label="Phase"
                value={displayPhaseId ? phaseLabel(displayPhaseId) : "Aucune phase"}
                onClick={() => setMoveAxis("phase")}
              />
            )}
            {collaboration && (
              <DetailRow
                chipClass="phase-chip-blue"
                icon={<IconUsers width={18} height={18} />}
                label="Responsable"
                value={assigneesLabel(collaboration.members, collaboration.assigneeIds)}
                onClick={() => setAssignOpen(true)}
              />
            )}
          </div>

          <div className="choice-group" style={{ marginBottom: 8 }}>
            <DetailRow
              chipClass="phase-chip-teal"
              icon={<IconMessage width={18} height={18} />}
              label="Notes"
              value={noteCount > 0 ? `${noteCount} note${noteCount > 1 ? "s" : ""}` : "Aucune note"}
              onClick={() => setNotesOpen(true)}
            />
            <DetailRow
              chipClass="phase-chip-purple"
              icon={<IconLink width={18} height={18} />}
              label="Lien"
              value={action.linkedActionId ? "Action liée" : "Aucune liaison"}
              onClick={() => setLinkOpen(true)}
            />
            {action.status === "waiting" && (
              <div className="action-menu-row" style={{ cursor: "default" }}>
                <span className="action-menu-icon phase-chip-orange" aria-hidden="true">
                  <IconBell width={18} height={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span className="action-menu-row-label">Relance</span>
                  <span className="action-menu-row-sub">
                    {reminderActive ? `Après ${reminder!.afterDays} j` : "Aucune relance"}
                  </span>
                </span>
                {reminderActive && (
                  <button type="button" className="btn tap-target" onClick={onDisableReminder}>
                    Désactiver
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="choice-group" style={{ marginBottom: 8, padding: "var(--space-3) var(--space-4)" }}>
            <p className="section-title" style={{ margin: "0 0 4px" }}>
              Description
            </p>
            {action.description ? (
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{action.description}</p>
            ) : (
              <p className="action-sub" style={{ margin: 0 }}>
                Aucune description.
              </p>
            )}
            <button
              type="button"
              className="btn tap-target"
              style={{ marginTop: 8 }}
              onClick={() => setEditing(true)}
            >
              <IconPencil width={14} height={14} /> {action.description ? "Modifier" : "Ajouter une description"}
            </button>
          </div>

          <div className="choice-group" style={{ marginBottom: 8, padding: "var(--space-3) var(--space-4)" }}>
            <p className="section-title" style={{ margin: "0 0 4px" }}>
              Activité
            </p>
            <p className="action-sub" style={{ margin: 0, display: "flex", alignItems: "center", gap: 6 }}>
              <IconNotebook width={14} height={14} /> Créée le {ACTIVITY_DATE_FORMAT.format(new Date(action.createdAt))}
            </p>
            <p className="action-sub" style={{ margin: "4px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
              <IconNotebook width={14} height={14} /> Modifiée le {ACTIVITY_DATE_FORMAT.format(new Date(action.updatedAt))}
            </p>
            {action.completedAt && (
              <p className="action-sub" style={{ margin: "4px 0 0", display: "flex", alignItems: "center", gap: 6 }}>
                <IconNotebook width={14} height={14} /> Terminée le {ACTIVITY_DATE_FORMAT.format(new Date(action.completedAt))}
              </p>
            )}
          </div>

          <div className="choice-group" style={{ marginBottom: 8 }}>
            <DetailRow
              chipClass="phase-chip-blue"
              icon={<IconArrowRight width={18} height={18} />}
              label="Déplacer"
              value="Changer de phase, planification ou statut"
              onClick={() => setMoveAxis("full")}
            />
          </div>

          <div className="choice-group">
            <DetailRow
              chipClass="phase-chip-red"
              icon={<IconTrash width={18} height={18} />}
              label="Supprimer"
              danger
              onClick={() => {
                onDelete();
                onClose();
              }}
            />
          </div>
        </div>
      </div>

      {editing && (
        <EditActionSheet
          action={action}
          onCancel={() => setEditing(false)}
          onSave={(edit) => {
            onEdit(edit);
            setEditing(false);
          }}
        />
      )}

      {moveAxis !== null && (
        <MoveActionSheet
          action={action}
          phaseOptions={phaseOptions}
          statusLabels={statusLabels}
          timezone={timezone}
          initialAxis={moveAxis === "full" ? undefined : moveAxis}
          onCancel={() => setMoveAxis(null)}
          onConfirm={(destination) => {
            onMove(destination);
            setMoveAxis(null);
          }}
          onSetReminder={onSetReminder}
        />
      )}

      {notesOpen && <NotesSheet action={action} onClose={() => setNotesOpen(false)} onAddNote={onAddNote} />}

      {linkOpen && (
        <LinkActionSheet
          action={action}
          workspaces={workspaces}
          actionsByWorkspace={actionsByWorkspace}
          onClose={() => setLinkOpen(false)}
          onLink={(linkedId) => {
            onLink(linkedId);
            setLinkOpen(false);
          }}
          onUnlink={onUnlink}
          onNavigate={onNavigate}
        />
      )}

      {assignOpen && collaboration && (
        <MemberAssignSheet
          members={collaboration.members}
          assigneeIds={collaboration.assigneeIds}
          onClose={() => setAssignOpen(false)}
          onChangeAssignees={collaboration.onChangeAssignees}
        />
      )}
    </>
  );
}

function DetailRow({
  chipClass,
  icon,
  label,
  value,
  danger,
  onClick,
}: {
  chipClass: string;
  icon: React.ReactNode;
  label: string;
  value?: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button type="button" className="action-menu-row" onClick={onClick}>
      <span className={`action-menu-icon ${chipClass}`} aria-hidden="true">
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span className="action-menu-row-label" style={danger ? { color: "var(--color-danger)" } : undefined}>
          {label}
        </span>
        {value && <span className="action-menu-row-sub">{value}</span>}
      </span>
    </button>
  );
}

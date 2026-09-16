import { useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { deriveScheduleKeys, formatRelativeLabel } from "../../calendar/calendar-engine";
import type { Member } from "../../domain/member";
import { cycleStatus } from "../../domain/move-action";
import type { Action, ActionStatus, WorkspaceKind } from "../../domain/types";
import { isWaitingReminderDue } from "../../reminders/waiting-reminder";
import { ITEM_TYPE_LABELS, KIND_LABELS, phaseLabel } from "../labels";
import { memberInitials } from "../utils/member-summary";
import { phaseChipClass } from "../utils/phase-color";
import { resolveDisplayPhaseId } from "../utils/resolve-phase";
import { ActionMenuSheet } from "./ActionMenuSheet";
import { IconCalendar, IconGripVertical, IconLink, IconMessage, IconMore, StatusCheckIcon } from "./Icons";

// Seuil de swipe exprimé en % de la largeur réelle de la carte (v2.2 —
// remplace l'ancien seuil en pixels fixes) : une carte étroite (téléphone en
// portrait 320px) et une carte large (tablette/desktop en fenêtre réduite)
// doivent réclamer le même geste proportionnel, pas la même distance
// absolue. Mesurée via getBoundingClientRect() au pointerdown (cf.
// handlePointerDown) plutôt qu'un ref+effect, pour capter la largeur exacte
// au moment du geste sans dépendre du cycle de rendu React.
const SWIPE_THRESHOLD_RATIO = 0.35;
const SWIPE_MAX_RATIO = 0.5;
const SWIPE_MAX_CAP = 220;
// jsdom (et tout DOM pas encore posé en layout) renvoie une largeur de 0 :
// on retombe sur une largeur de repli calibrée pour reproduire l'ancien
// seuil fixe (88px ≈ 35% de 251px), afin que les tests existants pilotés en
// pixels (deltaX) restent valides sans les récrire un par un.
const SWIPE_FALLBACK_WIDTH = 251;

/**
 * Carte d'action unique (Lot 2 du renouveau produit) : fusionne l'ancienne
 * `ActionCard` (listes mobile/desktop, swipe) et l'ancienne `KanbanCard`
 * (tableau Kanban desktop, drag & drop HTML5) derrière un seul composant.
 * `variant` ne pilote QUE la mise en page et les interactions réellement
 * spécifiques à chaque représentation (swipe vs drag, checkbox vs chip de
 * statut) — la résolution des badges, le menu d'actions et le statut de
 * synchronisation restent une seule logique partagée, jamais dupliquée.
 */
export function ActionCard({
  action,
  timezone,
  statusLabels,
  variant = "list",
  /** Fourni uniquement dans les vues transversales (plusieurs espaces mélangés) ; sans objet en variant "kanban" (toujours mono-espace). */
  workspaceName,
  workspaceKind,
  syncStatus,
  onOpenWorkspace,
  onMove,
  onCycleStatus,
  onSwipeComplete,
  onEdit,
  onDelete,
  onDisableReminder,
  onOpenNotes,
  onOpenLink,
  onOpenDetail,
  /** Drag & drop HTML5 (variant "kanban" uniquement) — ignorés en variant "list". */
  draggable,
  onDragStart,
  onDragEnd,
  phaseOptions,
  assignedMembers,
  compact,
  hideStatusCheck,
  showDescription,
}: {
  action: Action;
  timezone: string;
  statusLabels: Record<ActionStatus, string>;
  /** "list" (défaut) : cartes listes mobile/desktop, swipe terminer/replanifier. "kanban" : carte compacte du tableau Kanban desktop, drag & drop HTML5. */
  variant?: "list" | "kanban";
  workspaceName?: string;
  workspaceKind?: WorkspaceKind;
  /** "pending" : mutation pas encore confirmée synchronisée. "conflict" : bloquée par une version serveur plus récente (cf. SyncConflict). Absent = synchronisée. */
  syncStatus?: "pending" | "conflict";
  /** Navigue vers l'espace d'origine de l'action ; fourni avec workspaceKind dans les vues transversales. */
  onOpenWorkspace?: () => void;
  onMove: () => void;
  /** Cycle rapide 1-clic todo → doing → done (→ todo), sans passer par "Déplacer". Réservé au variant "list" (le variant "kanban" affiche le statut en chip, changé via drag & drop ou le menu). */
  onCycleStatus?: () => void;
  /** Swipe à droite : passe directement l'action à "Terminé" (équivalent geste de la checkbox/menu). Sans effet en variant "kanban" (jamais de swipe sur desktop, pour ne pas interférer avec le drag & drop natif). */
  onSwipeComplete?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onDisableReminder?: () => void;
  onOpenNotes?: () => void;
  onOpenLink?: () => void;
  /** Ouvre le détail unifié de l'action (Lot 5) au tap/clic sur le titre — jamais sur checkbox/menu/drag/swipe. Absent = comportement inchangé (écran pas encore migré). */
  onOpenDetail?: () => void;
  draggable?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  /** Phases actuelles de l'espace (variant "list", pour le chip de phase) — résout un phaseId legacy vers son équivalent courant via resolveDisplayPhaseId (Lot 6). Absent = comportement inchangé (phaseId affiché brut, écran multi-espaces sans phases uniques à résoudre). */
  phaseOptions?: string[];
  /** Responsables déjà résolus (Lot 8B) — initiales compactes, max 2 + "+N". Absent ou vide = rien affiché (mode Solo, ou action non assignée). */
  assignedMembers?: Member[];
  /** Densité "Résolu" (v2.2, RUN uniquement) : quand vrai ET l'action est terminée, remplace la carte complète par un format compact — badge "Résolu", titre, responsable. Sans effet sur une action non terminée, ni en variant "kanban" (jamais compacté, le Kanban a son propre chip de statut). Absent/faux = comportement inchangé (carte complète, juste atténuée). */
  compact?: boolean;
  /** Réalignement prototype (v2.2, RUN actif uniquement) : masque la checkbox de cycle todo→doing→done pour ne laisser que "Traiter" en avant, comme le prototype. `onCycleStatus` reste fourni et fonctionnel (le cycle rapide reste joignable via "Déplacer" dans le menu "•••") — aucune capacité perdue, seulement décluttée visuellement sur cet écran précis. Sans effet en variant "kanban" ni sur une carte compacte "Résolu" (jamais de checkbox là). */
  hideStatusCheck?: boolean;
  /** Réalignement prototype (v2.2, RUN actif) : affiche `action.description` (si présente) sur 2 lignes maximum sous le titre, comme la carte active du prototype. Absent/faux = comportement inchangé (pas de description affichée). */
  showDescription?: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragX, setDragX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    committed: boolean;
    width: number;
    max: number;
  } | null>(null);
  // Un swipe committed (list) ou un drag HTML5 (kanban) synthétise parfois
  // quand même un "click" natif au relâchement — sans ce garde-fou, ouvrir
  // le détail au clic sur le titre ouvrirait aussi le détail après un
  // simple swipe/déplacement, ce que Phase E interdit explicitement.
  const suppressClickRef = useRef(false);
  const isKanban = variant === "kanban";
  const noteCount = action.notes?.length ?? 0;
  const hasLink = Boolean(action.linkedActionId);
  const derived = deriveScheduleKeys(action.schedule, timezone);
  const scheduleLabel = formatRelativeLabel(derived.relativeLabel) || derived.dayKey || derived.isoWeekKey || derived.isoMonthKey;
  const isWaiting = action.status === "waiting";
  const isDone = action.status === "done";
  const reminderActive = isWaiting && action.waitingReminder?.enabled;
  const reminderDue = reminderActive && isWaitingReminderDue(action);
  const statusLabel = statusLabels[action.status];
  const nextStatusLabel = statusLabels[cycleStatus(action.status)];
  const ariaChecked = action.status === "done" ? "true" : action.status === "doing" ? "mixed" : "false";
  const hasChips = Boolean(action.phaseId) || action.priority === "high" || Boolean(workspaceKind) || action.itemType !== "task";
  // resolveDisplayPhaseId retombe sur la première phase du template quand
  // phaseId est absent (comportement voulu pour le regroupement en colonnes)
  // — mais ici, "pas de phase" doit rester "pas de chip", jamais la 1ère phase.
  const displayPhaseId = action.phaseId
    ? phaseOptions
      ? resolveDisplayPhaseId(action.phaseId, phaseOptions)
      : action.phaseId
    : undefined;
  // Le variant kanban n'a jamais de swipe : le geste tactile entrerait en
  // conflit avec le drag & drop HTML5 natif (mêmes événements pointeur).
  const swipeCompleteEnabled = !isKanban && Boolean(onSwipeComplete) && !isDone;
  // Une carte "Résolu" compacte n'a plus rien à faire glisser (déjà
  // terminée, aucun "Replanifier" pertinent) : le swipe se désactive avec
  // elle plutôt que de laisser un geste sans effet visible.
  const isCompactDone = Boolean(compact) && isDone && !isKanban;
  const swipeEnabled = !isKanban && !isCompactDone && (swipeCompleteEnabled || Boolean(onMove));

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!swipeEnabled || menuOpen) return;
    const targetEl = event.target as HTMLElement;
    // Le bouton "ouvrir le détail" recouvre presque toute la carte (titre +
    // métadonnées) : il doit rester une surface de départ valide pour le
    // swipe (le clic de synthèse qui suivrait un drag committed est déjà
    // neutralisé par suppressClickRef, cf. handleOpenDetailClick) — sinon un
    // geste amorcé sur un élément vraiment interactif (checkbox de statut,
    // "Traiter", menu "•••") ne doit jamais être capturé comme un swipe :
    // l'utilisateur voulait taper ce bouton, pas glisser la carte.
    if (!targetEl.closest?.(".action-card-open-detail") && targetEl.closest?.("button, a, input, select, textarea")) return;
    // Largeur mesurée une seule fois, au début du geste : la carte ne
    // change pas de taille pendant qu'on la fait glisser, pas besoin de la
    // remesurer à chaque pointermove. `max` est dérivé de cette même largeur
    // et figé ici pour que le seuil de relâchement (handlePointerUp) reste
    // toujours atteignable, y compris sur les cartes très larges où le cap
    // absolu (SWIPE_MAX_CAP) serait sinon plus restrictif que le seuil.
    const width = event.currentTarget.getBoundingClientRect().width || SWIPE_FALLBACK_WIDTH;
    const max = Math.min(width * SWIPE_MAX_RATIO, SWIPE_MAX_CAP);
    dragRef.current = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, committed: false, width, max };
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    if (!drag.committed) {
      // Zone morte + intention clairement horizontale, pour ne jamais gêner
      // le défilement vertical de la liste ni un simple tap.
      if (Math.abs(deltaX) < 10 || Math.abs(deltaX) < Math.abs(deltaY)) return;
      drag.committed = true;
      suppressClickRef.current = true;
      setIsDragging(true);
      // Absent en environnement de test (jsdom) : optionnel, sans impact
      // fonctionnel puisque la capture ne fait que fiabiliser le suivi du
      // pointeur au-delà des bords de l'élément.
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    event.preventDefault();
    const clamped = Math.max(-drag.max, Math.min(drag.max, deltaX));
    setDragX(swipeCompleteEnabled ? clamped : Math.min(clamped, 0));
  }

  function handlePointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    if (drag.committed) {
      // Le seuil ne doit jamais dépasser la distance de glissement
      // effectivement atteignable (drag.max) : sur une carte large où
      // largeur × 35 % > cap absolu, un seuil non plafonné rendrait le
      // geste impossible à valider quelle que soit la distance parcourue.
      const threshold = Math.min(drag.width * SWIPE_THRESHOLD_RATIO, drag.max);
      if (dragX >= threshold && swipeCompleteEnabled) {
        onSwipeComplete!();
      } else if (dragX <= -threshold) {
        onMove();
      }
    }
    setDragX(0);
  }

  /**
   * Annulation pure (aucune action déclenchée), pour deux cas où un
   * relâchement "normal" n'a pas eu lieu : pointercancel (interruption
   * système/appli) et sortie de l'élément à la souris avant que le geste
   * ne soit devenu horizontal — donc avant capture du pointeur, si bien
   * qu'aucun pointerup ne sera jamais reçu ici et le drag resterait
   * fantôme pour un futur geste réutilisant le même pointerId.
   */
  function cancelDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setIsDragging(false);
    setDragX(0);
  }

  function handlePointerLeave(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragRef.current?.committed) return;
    cancelDrag(event);
  }

  function handleOpenDetailClick() {
    if (suppressClickRef.current) {
      // Le clic qui suit un swipe/drag committed ne doit jamais ouvrir le
      // détail (Phase E) — consommé une seule fois, pas un verrou permanent.
      suppressClickRef.current = false;
      return;
    }
    onOpenDetail?.();
  }

  const menu = menuOpen && (
    <ActionMenuSheet
      action={action}
      noteCount={noteCount}
      hasLink={hasLink}
      onClose={() => setMenuOpen(false)}
      onEdit={onEdit}
      onMove={onMove}
      onDelete={onDelete}
      onOpenNotes={onOpenNotes}
      onOpenLink={onOpenLink}
    />
  );

  const menuButton = (
    <button type="button" className="icon-btn" onClick={() => setMenuOpen(true)} aria-label={`Actions pour "${action.title}"`}>
      <IconMore />
    </button>
  );

  const title = (
    <span
      className="action-title"
      style={isDone ? { textDecoration: "line-through", textDecorationColor: "var(--color-text-tertiary)" } : undefined}
    >
      {action.title}
    </span>
  );

  const noteAndLinkChips = (
    <>
      {assignedMembers && assignedMembers.length > 0 && (
        <span
          className="meta-chip"
          aria-label={`Responsable${assignedMembers.length > 1 ? "s" : ""} : ${assignedMembers.map((m) => m.displayName).join(", ")}`}
        >
          {assignedMembers
            .slice(0, 2)
            .map((m) => memberInitials(m.displayName))
            .join(" ")}
          {assignedMembers.length > 2 ? ` +${assignedMembers.length - 2}` : ""}
        </span>
      )}
      {noteCount > 0 && (
        <span className="meta-chip">
          <IconMessage width={14} height={14} /> {noteCount}
        </span>
      )}
      {hasLink && (
        <span className="meta-chip">
          <IconLink width={14} height={14} />
        </span>
      )}
      {syncStatus && (
        <span className={`meta-chip sync-chip sync-chip-${syncStatus}`} role="status">
          {syncStatus === "conflict" ? "Conflit" : "En attente"}
        </span>
      )}
    </>
  );

  if (isCompactDone) {
    const resolvedTitle = <span className="action-title action-card-resolved-title">{action.title}</span>;
    return (
      <div className="action-card action-card-resolved">
        <span className="badge badge-resolved">Résolu</span>
        {/* Compacter la carte ne doit pas retirer l'accès au détail/menu — une
            action résolue reste consultable (notes, lien) et corrigible
            (rouvrir, éditer, supprimer) depuis la liste RUN elle-même. */}
        {onOpenDetail ? (
          <button type="button" className="action-card-open-detail action-card-resolved-open" onClick={handleOpenDetailClick}>
            {resolvedTitle}
          </button>
        ) : (
          resolvedTitle
        )}
        {assignedMembers && assignedMembers.length > 0 && (
          // Prototype (v2.2) : nom en clair sur la ligne compacte "Résolu",
          // pas d'initiales en cercle (réservées à la carte active). Même
          // troncature multi-responsables que le chip complet ci-dessus.
          <span
            className="meta-chip action-card-resolved-assignee"
            aria-label={`Responsable${assignedMembers.length > 1 ? "s" : ""} : ${assignedMembers.map((m) => m.displayName).join(", ")}`}
          >
            {assignedMembers[0]!.displayName}
            {assignedMembers.length > 1 ? ` +${assignedMembers.length - 1}` : ""}
          </span>
        )}
        {/* Une complétion pas encore confirmée (hors-ligne) ne doit jamais
            paraître définitivement synchronisée (principe repris de l'audit
            mobile) : le badge "Résolu" seul l'aurait laissé croire. */}
        {syncStatus && (
          <span className={`meta-chip sync-chip sync-chip-${syncStatus}`} role="status">
            {syncStatus === "conflict" ? "Conflit" : "En attente"}
          </span>
        )}
        {menuButton}
        {menu}
      </div>
    );
  }

  if (isKanban) {
    const kanbanInfo = (
      <>
        {title}
        <div className="action-card-chips">
          <span className="status-chip" data-status={action.status}>
            {statusLabel}
          </span>
          {action.priority === "high" && <span className="phase-chip phase-chip-red">Prioritaire</span>}
          {action.itemType !== "task" && (
            <span className="phase-chip phase-chip-gray">{ITEM_TYPE_LABELS[action.itemType]}</span>
          )}
        </div>
        <div className="action-sub">
          <span>{scheduleLabel || "Aucune échéance"}</span>
          {noteAndLinkChips}
        </div>
      </>
    );
    return (
      <div
        className="kanban-card"
        draggable={draggable}
        onDragStart={() => {
          suppressClickRef.current = true;
          onDragStart?.();
        }}
        onDragEnd={onDragEnd}
      >
        <span className="kanban-card-handle" aria-hidden="true">
          <IconGripVertical width={16} height={16} />
        </span>
        {onOpenDetail ? (
          <button
            type="button"
            className="action-card-open-detail"
            style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}
            onClick={handleOpenDetailClick}
          >
            {kanbanInfo}
          </button>
        ) : (
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>{kanbanInfo}</div>
        )}
        {menuButton}
        {onDisableReminder && reminderActive && (
          <div className="action-sub" style={{ color: "var(--color-warning-text)", fontWeight: 600 }} role="status">
            {reminderDue ? "Relance due" : "Relance active"}
            <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={onDisableReminder}>
              Désactiver
            </button>
          </div>
        )}
        {menu}
      </div>
    );
  }

  const listInfo = (
    <>
      {title}
      {showDescription && action.description && <p className="action-card-desc">{action.description}</p>}
      <div className="action-sub">
        <span>
          {workspaceName ? `${workspaceName} · ` : ""}
          {statusLabel}
          {scheduleLabel ? ` · ${scheduleLabel}` : " · Aucune échéance"}
          {reminderActive && !reminderDue ? ` · Relance après ${action.waitingReminder!.afterDays} j` : ""}
        </span>
        {noteAndLinkChips}
      </div>
    </>
  );

  return (
    <div className="action-card" style={isDone ? { opacity: 0.72 } : undefined}>
      {swipeEnabled && (
        <div className="action-card-swipe-bg" aria-hidden="true">
          {swipeCompleteEnabled && (
            <span className="action-card-swipe-bg-complete">
              <StatusCheckIcon status="done" /> Terminer
            </span>
          )}
          <span className="action-card-swipe-bg-reschedule">
            Replanifier <IconCalendar width={18} height={18} />
          </span>
        </div>
      )}
      <div
        className={`action-card-swipe-content${isDragging ? " is-dragging" : ""}`}
        style={dragX !== 0 ? { transform: `translateX(${dragX}px)` } : undefined}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={cancelDrag}
        onPointerLeave={handlePointerLeave}
      >
        {hasChips && (
          <div className="action-card-chips">
            {workspaceKind && onOpenWorkspace ? (
              <button type="button" className={`badge badge-${workspaceKind} badge-button`} onClick={onOpenWorkspace}>
                {KIND_LABELS[workspaceKind]}
              </button>
            ) : (
              workspaceKind && <span className={`badge badge-${workspaceKind}`}>{KIND_LABELS[workspaceKind]}</span>
            )}
            {displayPhaseId && (
              <span className={`phase-chip ${phaseChipClass(displayPhaseId)}`}>{phaseLabel(displayPhaseId)}</span>
            )}
            {action.priority === "high" && <span className="phase-chip phase-chip-red">Prioritaire</span>}
            {action.itemType !== "task" && (
              <span className="phase-chip phase-chip-gray">{ITEM_TYPE_LABELS[action.itemType]}</span>
            )}
          </div>
        )}
        <div className="action-card-body">
          {onCycleStatus && !hideStatusCheck && (
            <button
              type="button"
              className="status-check"
              role="checkbox"
              aria-checked={ariaChecked}
              aria-label={`Statut de "${action.title}" : ${statusLabel}. Appuyer pour passer à ${nextStatusLabel}.`}
              onClick={onCycleStatus}
            >
              <StatusCheckIcon status={action.status} />
            </button>
          )}
          {/* "Traiter" (v2.2 §4) : équivalent non-geste EXACT du swipe à droite
              (passe directement à "Terminé"), toujours visible et identique
              desktop/mobile — distinct de la checkbox de statut ci-dessus, qui
              cycle todo→doing→done sans jamais sauter d'étape. Un bouton
              unique aurait fallu soit renommer la checkbox de façon trompeuse
              (elle ne termine pas toujours en un clic), soit changer son
              comportement historique de cycle — les deux cassaient un usage
              existant plutôt que d'ajouter l'équivalent promis par le swipe. */}
          {swipeCompleteEnabled && (
            <button type="button" className="btn action-card-treat tap-target" onClick={onSwipeComplete}>
              Traiter
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            {onOpenDetail ? (
              <button type="button" className="action-card-open-detail" onClick={handleOpenDetailClick}>
                {listInfo}
              </button>
            ) : (
              listInfo
            )}
            {reminderDue && (
              <div className="action-sub" style={{ color: "var(--color-warning-text)", fontWeight: 600 }} role="status">
                Relance due
                {onDisableReminder && (
                  <button type="button" className="btn" style={{ marginLeft: 8 }} onClick={onDisableReminder}>
                    Désactiver la relance
                  </button>
                )}
              </div>
            )}
          </div>
          {menuButton}
        </div>
      </div>
      {menu}
    </div>
  );
}

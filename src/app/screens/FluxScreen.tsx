import { useMemo, useState } from "react";
import type { Action } from "../../domain/types";
import { resolveWorkspacePreset } from "../../presets/preset-registry";
import { useStore } from "../adapters/temporary-store";
import { ActionDetailSheet } from "../components/ActionDetailSheet";
import { UndoBanner } from "../components/UndoBanner";
import { useDeleteWithUndo } from "../hooks/useDeleteWithUndo";
import { useMoveWithUndo } from "../hooks/useMoveWithUndo";
import { STATUS_LABELS_DEFAULT } from "../labels";
import { buildFlux } from "../utils/flux";
import { humanSchedule } from "../utils/human-date";

function greeting(hour: number): string {
  if (hour < 5 || hour >= 22) return "Bonne nuit";
  if (hour < 12) return "Bonjour";
  if (hour < 18) return "Bon après-midi";
  return "Bonsoir";
}

/**
 * Flux : l'écran d'accueil répond à une seule question, "que faire
 * maintenant ?". Une carte Focus (la prochaine chose à faire), puis des
 * couloirs temporels (Maintenant / Bientôt / En attente / Un jour) qui
 * mélangent tous les espaces : on pense en moments, pas en dossiers.
 * La saisie se fait dans le compositeur global (barre du bas).
 */
export function FluxScreen({
  timezone,
  onNavigateToWorkspace,
}: {
  timezone: string;
  onNavigateToWorkspace: (workspaceId: string) => void;
}) {
  const { state, editAction, setReminder, disableReminder, addNote, linkAction, unlinkAction } = useStore();
  const { pendingUndo, move, cancelLastMove } = useMoveWithUndo();
  const { pendingUndo: pendingDelete, remove, cancelLastDelete } = useDeleteWithUndo();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [showSomeday, setShowSomeday] = useState(false);

  const actions = useMemo(() => Object.values(state.actionsByWorkspace).flat(), [state.actionsByWorkspace]);
  const flux = useMemo(() => buildFlux(actions, timezone), [actions, timezone]);
  const spaceName = (action: Action) => state.workspaces.find((workspace) => workspace.id === action.workspaceId)?.name;
  const detail = detailId ? actions.find((action) => action.id === detailId) : undefined;
  const detailWorkspace = detail ? state.workspaces.find((workspace) => workspace.id === detail.workspaceId) : undefined;
  const detailPreset = detailWorkspace ? resolveWorkspacePreset(detailWorkspace) : undefined;

  const remaining = flux.now.length + (flux.focus ? 1 : 0);
  const progress = flux.doneToday + remaining === 0 ? 0 : flux.doneToday / (flux.doneToday + remaining);
  const now = new Date();
  const rawDate = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: timezone }).format(now);
  const dateLabel = rawDate.charAt(0).toUpperCase() + rawDate.slice(1);
  const hour = Number(new Intl.DateTimeFormat("fr-FR", { hour: "numeric", hourCycle: "h23", timeZone: timezone }).format(now));

  function complete(action: Action) {
    navigator.vibrate?.(12);
    move(action.workspaceId, action, { axis: "status", status: "done" });
  }

  function postpone(action: Action) {
    const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: timezone }).format(new Date(now.getTime() + 864e5));
    move(action.workspaceId, action, { axis: "schedule", to: { kind: "day", date: tomorrow } });
  }

  const row = (action: Action) => (
    <FluxRow
      key={action.id}
      action={action}
      meta={[spaceName(action), humanSchedule(action.schedule, timezone)].filter(Boolean).join(" · ")}
      onComplete={() => complete(action)}
      onOpen={() => setDetailId(action.id)}
    />
  );

  return (
    <div className="flux">
      <header className="flux-hero">
        <div>
          <p className="flux-date">{dateLabel}</p>
          <h1 className="flux-greeting">{greeting(hour)}</h1>
          <p className="flux-summary">{summary(remaining, flux.doneToday)}</p>
        </div>
        <ProgressRing
          value={progress}
          text={`${flux.doneToday}/${flux.doneToday + remaining}`}
          label={`${flux.doneToday} terminée${flux.doneToday > 1 ? "s" : ""} aujourd'hui sur ${flux.doneToday + remaining}`}
        />
      </header>

      {flux.focus ? (
        <section className="flux-focus" aria-labelledby="flux-focus-title">
          <p className="flux-focus-kicker">Maintenant, une seule chose</p>
          <button type="button" className="flux-focus-title" id="flux-focus-title" onClick={() => setDetailId(flux.focus!.id)}>
            {flux.focus.title}
          </button>
          <p className="flux-focus-meta">
            {[spaceName(flux.focus), humanSchedule(flux.focus.schedule, timezone), flux.focus.priority === "high" ? "Prioritaire" : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <div className="flux-focus-actions">
            <button type="button" className="btn btn-primary" onClick={() => complete(flux.focus!)}>
              C&apos;est fait
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => postpone(flux.focus!)}>
              Demain
            </button>
          </div>
        </section>
      ) : (
        <section className="flux-focus flux-focus-empty">
          <p className="flux-focus-kicker">Rien d&apos;urgent</p>
          <p className="flux-focus-title">Journée libre. Notez une idée en bas, elle trouvera sa place.</p>
        </section>
      )}

      <Lane title="Maintenant" items={flux.now} render={row} />
      <Lane title="Bientôt" items={flux.soon} render={row} />
      <Lane title="En attente" items={flux.waiting} render={row} />
      {flux.someday.length > 0 && (
        <section className="flux-lane">
          <button type="button" className="flux-lane-toggle" aria-expanded={showSomeday} onClick={() => setShowSomeday((open) => !open)}>
            <span>Un jour</span>
            <span className="flux-count">{flux.someday.length}</span>
          </button>
          {showSomeday && <ul className="flux-list">{flux.someday.map(row)}</ul>}
        </section>
      )}

      {detail && detailWorkspace && (
        <ActionDetailSheet
          action={detail}
          phaseOptions={detailPreset?.phaseTemplate ?? []}
          statusLabels={{ ...STATUS_LABELS_DEFAULT, ...detailPreset?.statusLabels }}
          timezone={timezone}
          workspaces={state.workspaces}
          actionsByWorkspace={state.actionsByWorkspace}
          onClose={() => setDetailId(null)}
          onEdit={(edit) => editAction(detail.workspaceId, detail.id, edit)}
          onMove={(destination) => move(detail.workspaceId, detail, destination)}
          onSetReminder={(afterDays) => setReminder(detail.workspaceId, detail.id, afterDays)}
          onDisableReminder={() => disableReminder(detail.workspaceId, detail.id)}
          onAddNote={(text) => addNote(detail.workspaceId, detail.id, text)}
          onLink={(linkedId) => linkAction(detail.workspaceId, detail.id, linkedId)}
          onUnlink={() => unlinkAction(detail.workspaceId, detail.id)}
          onNavigate={onNavigateToWorkspace}
          onDelete={() => remove(detail.workspaceId, detail)}
        />
      )}

      {pendingUndo && <UndoBanner message="C'est noté." onUndo={cancelLastMove} />}
      {pendingDelete && <UndoBanner message="Action supprimée." onUndo={cancelLastDelete} />}
    </div>
  );
}

function summary(remaining: number, done: number): string {
  if (remaining === 0 && done === 0) return "Rien de prévu aujourd'hui.";
  if (remaining === 0) return "Tout est fait pour aujourd'hui. Bravo.";
  return `${remaining} chose${remaining > 1 ? "s" : ""} pour aujourd'hui${done ? `, ${done} déjà faite${done > 1 ? "s" : ""}` : ""}.`;
}

function Lane({ title, items, render }: { title: string; items: Action[]; render: (action: Action) => JSX.Element }) {
  if (items.length === 0) return null;
  return (
    <section className="flux-lane" aria-label={title}>
      <h2 className="flux-lane-title">
        <span>{title}</span>
        <span className="flux-count">{items.length}</span>
      </h2>
      <ul className="flux-list">{items.map(render)}</ul>
    </section>
  );
}

function FluxRow({ action, meta, onComplete, onOpen }: { action: Action; meta: string; onComplete: () => void; onOpen: () => void }) {
  return (
    <li className="flux-row" data-priority={action.priority}>
      <button type="button" className="flux-check" aria-label={`Terminer "${action.title}"`} onClick={onComplete} />
      <button type="button" className="flux-row-body" onClick={onOpen}>
        <span className="flux-row-title">{action.title}</span>
        {meta && <span className="flux-row-meta">{meta}</span>}
      </button>
    </li>
  );
}

function ProgressRing({ value, text, label }: { value: number; text: string; label: string }) {
  const circumference = 2 * Math.PI * 22;
  return (
    <svg className="flux-ring" viewBox="0 0 52 52" role="img" aria-label={label}>
      <circle cx="26" cy="26" r="22" className="flux-ring-track" />
      <circle
        cx="26"
        cy="26"
        r="22"
        className="flux-ring-value"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - value)}
        transform="rotate(-90 26 26)"
      />
      <text x="26" y="30.5" textAnchor="middle" aria-hidden="true">
        {text}
      </text>
    </svg>
  );
}

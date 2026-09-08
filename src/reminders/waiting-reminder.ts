import type { Action, WaitingReminderRule } from "../domain/types";

const MS_PER_DAY = 86_400_000;

/**
 * Relance après N jours au statut "waiting" (cadrage §10). Distincte du
 * moteur de récurrence (répétition périodique) : ici une seule échéance
 * calculée depuis `waitingSince`, dérivée par instant (N × 24h), pas par
 * jour calendaire — la durée d'attente ne dépend pas du fuseau utilisateur.
 */

export function setWaitingReminder(action: Action, afterDays: number): Action {
  if (!Number.isInteger(afterDays) || afterDays < 1) {
    throw new Error("Le délai de relance doit être un entier >= 1 jour");
  }
  const history = action.waitingReminder?.history ?? [];
  return {
    ...action,
    waitingReminder: { afterDays, enabled: true, history },
  };
}

/**
 * Désactive la relance sans supprimer le réglage (afterDays) ni
 * l'historique déjà accumulé (cadrage §10 : "possibilité de désactiver
 * sans supprimer les occurrences existantes").
 */
export function disableWaitingReminder(action: Action): Action {
  if (!action.waitingReminder) return action;
  return {
    ...action,
    waitingReminder: { ...action.waitingReminder, enabled: false },
  };
}

function computeDueAt(waitingSince: string, afterDays: number): string {
  return new Date(new Date(waitingSince).getTime() + afterDays * MS_PER_DAY).toISOString();
}

/** Lecture pure : la relance est-elle due maintenant ? N'écrit rien. */
export function isWaitingReminderDue(action: Action, now: Date = new Date()): boolean {
  const rule = action.waitingReminder;
  if (!rule?.enabled || action.status !== "waiting" || !action.waitingSince) {
    return false;
  }
  return now.toISOString() >= computeDueAt(action.waitingSince, rule.afterDays);
}

/**
 * Enregistre le déclenchement dans l'historique si la relance est due et
 * pas déjà enregistrée pour la période d'attente en cours (idempotent :
 * rejouer cet appel autant de fois que voulu ne produit qu'une seule
 * entrée par période, tant que `waitingSince` ne change pas).
 */
export function triggerWaitingReminderIfDue(action: Action, now: Date = new Date()): Action {
  const rule = action.waitingReminder;
  if (!rule || !action.waitingSince || !isWaitingReminderDue(action, now)) {
    return action;
  }
  const alreadyTriggeredForThisWait = rule.history.some((entry) => entry >= action.waitingSince!);
  if (alreadyTriggeredForThisWait) {
    return action;
  }
  return {
    ...action,
    waitingReminder: { ...rule, history: [...rule.history, now.toISOString()] },
  };
}

export type { WaitingReminderRule };

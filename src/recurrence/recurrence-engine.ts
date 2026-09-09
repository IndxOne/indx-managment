import { addDays, parseCalendarDate } from "../calendar/iso-week";
import type { Action, Priority, WorkItemType } from "../domain/types";

export type RecurrenceFrequency = "daily" | "weekly" | "monthly";

export interface RecurrenceRule {
  id: string;
  workspaceId: string;
  frequency: RecurrenceFrequency;
  /** Périodicité (tous les N jours/semaines/mois), >= 1. */
  interval: number;
  /** Date d'ancrage de la récurrence (YYYY-MM-DD). */
  startDate: string;
  /** Bornage inclusif optionnel. */
  endDate?: string;
  template: {
    title: string;
    description?: string;
    priority: Priority;
    itemType: WorkItemType;
    phaseId?: string;
    assigneeIds: string[];
    tags: string[];
  };
}

export interface GenerationWindow {
  /** Bornes inclusives, YYYY-MM-DD. */
  start: string;
  end: string;
}

/**
 * Génère les occurrences d'une règle sur une fenêtre donnée. Pure et
 * déterministe : l'id de chaque occurrence est dérivé de `${rule.id}__${date}`,
 * donc deux appels avec les mêmes paramètres produisent exactement les mêmes
 * actions — une persistance qui fait un upsert par id ne duplique jamais
 * une occurrence déjà générée (idempotence, cadrage §10).
 */
export function generateRecurringOccurrences(rule: RecurrenceRule, window: GenerationWindow): Action[] {
  if (rule.interval < 1) {
    throw new Error("L'intervalle de récurrence doit être >= 1");
  }
  parseCalendarDate(rule.startDate);
  parseCalendarDate(window.start);
  parseCalendarDate(window.end);

  const occurrences: Action[] = [];
  const effectiveEnd = rule.endDate && rule.endDate < window.end ? rule.endDate : window.end;

  // Chaque occurrence est calculée depuis l'ancre d'origine (startDate),
  // jamais depuis l'occurrence précédente : un calage mensuel sur un jour
  // inexistant (31 janvier -> 28 février) ne doit pas "coller" au 28 pour
  // les mois suivants (le 31 mars doit rester le 31 mars).
  for (let index = 0; ; index += 1) {
    const dateValue = occurrenceDateAtIndex(rule, index);
    if (dateValue > effectiveEnd) break;
    if (dateValue >= window.start) {
      occurrences.push(buildOccurrence(rule, dateValue));
    }
  }

  return occurrences;
}

function occurrenceDateAtIndex(rule: RecurrenceRule, index: number): string {
  const offset = index * rule.interval;
  switch (rule.frequency) {
    case "daily":
      return addDays(rule.startDate, offset);
    case "weekly":
      return addDays(rule.startDate, offset * 7);
    case "monthly":
      return addMonths(rule.startDate, offset);
  }
}

function addMonths(dateValue: string, months: number): string {
  const { year, month, day } = parseCalendarDate(dateValue);
  const totalMonths = year * 12 + (month - 1) + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = (totalMonths % 12) + 1;
  const daysInTargetMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(day, daysInTargetMonth); // ex. 31 janvier -> 28/29 février
  return `${targetYear.toString().padStart(4, "0")}-${targetMonth.toString().padStart(2, "0")}-${targetDay
    .toString()
    .padStart(2, "0")}`;
}

function buildOccurrence(rule: RecurrenceRule, dateValue: string): Action {
  return {
    id: `${rule.id}__${dateValue}`,
    workspaceId: rule.workspaceId,
    title: rule.template.title,
    description: rule.template.description,
    status: "todo",
    priority: rule.template.priority,
    itemType: rule.template.itemType,
    phaseId: rule.template.phaseId,
    schedule: { granularity: "day", value: dateValue },
    assigneeIds: rule.template.assigneeIds,
    tags: rule.template.tags,
    recurrenceRuleId: rule.id,
    createdAt: dateValue,
    updatedAt: dateValue,
  };
}

/**
 * Fenêtre de matérialisation par défaut à la création d'une règle : depuis
 * son ancre jusqu'à `horizonDays` (90 par défaut), bornée par `endDate` si
 * plus proche. Pas d'ordonnanceur en tâche de fond (cf. relances) : au-delà
 * de cet horizon, aucune nouvelle occurrence n'apparaît pour l'instant.
 */
export function defaultMaterializationWindow(
  rule: Pick<RecurrenceRule, "startDate" | "endDate">,
  today: string,
  horizonDays = 90
): GenerationWindow {
  const horizonEnd = addDays(today, horizonDays);
  const end = rule.endDate && rule.endDate < horizonEnd ? rule.endDate : horizonEnd;
  return { start: rule.startDate, end };
}

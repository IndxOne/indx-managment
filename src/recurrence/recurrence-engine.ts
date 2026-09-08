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
  let cursor = rule.startDate;

  // Aligner le curseur sur la cadence de la règle avant d'entrer dans la fenêtre.
  while (cursor < window.start) {
    cursor = advance(cursor, rule);
  }

  const effectiveEnd = rule.endDate && rule.endDate < window.end ? rule.endDate : window.end;

  while (cursor <= effectiveEnd) {
    occurrences.push(buildOccurrence(rule, cursor));
    cursor = advance(cursor, rule);
  }

  return occurrences;
}

function advance(dateValue: string, rule: RecurrenceRule): string {
  switch (rule.frequency) {
    case "daily":
      return addDays(dateValue, rule.interval);
    case "weekly":
      return addDays(dateValue, rule.interval * 7);
    case "monthly":
      return addMonths(dateValue, rule.interval);
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
    schedule: { granularity: "day", value: dateValue },
    assigneeIds: rule.template.assigneeIds,
    tags: rule.template.tags,
    recurrenceRuleId: rule.id,
    createdAt: dateValue,
    updatedAt: dateValue,
  };
}

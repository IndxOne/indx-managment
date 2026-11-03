/**
 * Saisie rapide en langage naturel (français), façon « quick add ».
 * Pur et sans dépendance : appelé à chaque frappe, il reste linéaire et
 * n'alloue que le strict nécessaire.
 */
import {
  addDays,
  formatIsoMonth,
  formatIsoWeek,
  getIsoWeekday,
  parseCalendarDate,
} from "../../calendar/iso-week";
import type { Priority, Schedule } from "../types";

export type CaptureTokenKind = "date" | "priority" | "space" | "waiting";

export interface CaptureToken {
  kind: CaptureTokenKind;
  label: string;
}

export interface ParsedCapture {
  title: string;
  schedule?: Schedule;
  priority?: Priority;
  spaceQuery?: string;
  waiting?: boolean;
  tokens: CaptureToken[];
}

interface DateHit {
  schedule: Schedule;
  label: string;
}

type DateRule = [RegExp, (m: RegExpExecArray, today: string) => DateHit | undefined];

// Bornes de mot Unicode (\b de JS ne connaît que l'ASCII) ; # et @ exclus pour ne pas mordre sur un #espace.
const B = "(?<![\\p{L}\\p{N}#@])";
const E = "(?![\\p{L}\\p{N}])";
const rx = (body: string) => new RegExp(B + body + E, "gu");

const WEEKDAYS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];
// Préfixes discriminants des mois (juin/juil exigent 4 lettres).
const MONTHS = ["jan", "fev", "mar", "avr", "mai", "juin", "juil", "aou", "sep", "oct", "nov", "dec"];
const MONTH_RX =
  "(janvier|janv|fevrier|fevr|fev|mars|avril|avr|mai|juin|juillet|juil|aout|septembre|sept|octobre|oct|novembre|nov|decembre|dec)\\.?";

const DAY_FMT = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Minuscules sans accents, utilisé pour comparer des noms. */
const fold = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

function day(value: string, today: string): DateHit {
  const label =
    value === today
      ? "Aujourd'hui"
      : value === addDays(today, 1)
        ? "Demain"
        : capitalize(DAY_FMT.format(new Date(`${value}T00:00:00Z`)));
  return { schedule: { granularity: "day", value }, label };
}

const isValid = (value: string) => {
  try {
    parseCalendarDate(value);
    return true;
  } catch {
    return false;
  }
};

/** Date explicite ; sans année et déjà passée → année suivante. Invalide → undefined. */
function explicitDate(d: number, m: number, y: string | undefined, today: string): DateHit | undefined {
  const build = (year: number) => `${year}-${m.toString().padStart(2, "0")}-${d.toString().padStart(2, "0")}`;
  let value = build(y ? Number(y) : parseCalendarDate(today).year);
  if (!y && (!isValid(value) || value < today)) value = build(parseCalendarDate(today).year + 1);
  return isValid(value) ? day(value, today) : undefined;
}

const DATE_RULES: DateRule[] = [
  [rx("(?:aujourd'hui|auj|ce\\s+soir)"), (_, t) => day(t, t)],
  [rx("apres[-\\s]+demain"), (_, t) => day(addDays(t, 2), t)],
  [rx("demain"), (_, t) => day(addDays(t, 1), t)],
  [
    rx(`(?:ce\\s+)?(${WEEKDAYS.join("|")})(?:\\s+prochain)?`),
    (m, t) => {
      const target = WEEKDAYS.indexOf(m[1] ?? "") + 1;
      return day(addDays(t, (target - getIsoWeekday(t) + 7) % 7 || 7), t);
    },
  ],
  [
    rx("dans\\s+(\\d{1,3})\\s*(jours?|j|semaines?)"),
    (m, t) => day(addDays(t, Number(m[1]) * (m[2]?.startsWith("s") ? 7 : 1)), t),
  ],
  [rx("cette\\s+semaine"), (_, t) => ({ schedule: { granularity: "week", value: formatIsoWeek(t) }, label: "Cette semaine" })],
  [
    rx("semaine\\s+prochaine"),
    (_, t) => ({ schedule: { granularity: "week", value: formatIsoWeek(addDays(t, 7)) }, label: "Semaine prochaine" }),
  ],
  [rx("ce\\s+mois(?:-ci)?"), (_, t) => ({ schedule: { granularity: "month", value: formatIsoMonth(t) }, label: "Ce mois-ci" })],
  [
    rx("mois\\s+prochain"),
    (_, t) => {
      const { year, month } = parseCalendarDate(t);
      const value = month === 12 ? `${year + 1}-01` : `${year}-${(month + 1).toString().padStart(2, "0")}`;
      return { schedule: { granularity: "month", value }, label: "Mois prochain" };
    },
  ],
  [
    rx("(\\d{1,2})/(\\d{1,2})(?:/(\\d{4}))?"),
    (m, t) => explicitDate(Number(m[1]), Number(m[2]), m[3], t),
  ],
  [
    rx(`(\\d{1,2})(?:er)?\\s+${MONTH_RX}(?:\\s+(\\d{4}))?`),
    (m, t) => {
      const name = m[2] ?? "";
      return explicitDate(Number(m[1]), MONTHS.findIndex((p) => name.startsWith(p)) + 1, m[3], t);
    },
  ],
];

const PRIORITY_RX = new RegExp(`(?<!\\S)!{1,3}(?!\\S)|${B}(?:urgent|important|prioritaire)${E}`, "gu");
const WAITING_RX = new RegExp(`(?<![\\p{L}\\p{N}@])@attente${E}|${B}en\\s+attente${E}`, "gu");
const SPACE_RX = new RegExp(`(?<![\\p{L}\\p{N}#])#([\\p{L}\\p{N}_-]+)`, "gu");

interface Hit {
  start: number;
  end: number;
  token: CaptureToken;
  apply: () => void;
}

/** Première occurrence (la plus à gauche, puis la plus longue) parmi des règles. */
function firstMatch<T>(
  text: string,
  rules: [RegExp, (m: RegExpExecArray) => T | undefined][],
): { m: RegExpExecArray; value: T } | undefined {
  let best: { m: RegExpExecArray; value: T } | undefined;
  for (const [re, toValue] of rules) {
    re.lastIndex = 0;
    for (let m = re.exec(text); m; m = re.exec(text)) {
      if (best && (m.index > best.m.index || (m.index === best.m.index && m[0].length <= best.m[0].length))) break;
      const value = toValue(m);
      if (value !== undefined) {
        best = { m, value };
        break;
      }
    }
  }
  return best;
}

export function parseCapture(input: string, today: string): ParsedCapture {
  const src = input.normalize("NFC");
  // Version repliée de même longueur que `src` : les index restent alignés.
  let text = "";
  for (const ch of src) {
    const f = fold(ch).replace(/[’`]/, "'");
    text += f.length === ch.length ? f : ch;
  }

  const result: ParsedCapture = { title: "", tokens: [] };
  const hits: Hit[] = [];
  const push = (m: RegExpExecArray, token: CaptureToken, apply: () => void) =>
    hits.push({ start: m.index, end: m.index + m[0].length, token, apply });

  const date = firstMatch(text, DATE_RULES.map(([re, fn]) => [re, (m) => fn(m, today)]));
  if (date) {
    const { schedule, label } = date.value;
    push(date.m, { kind: "date", label }, () => (result.schedule = schedule));
  }
  const prio = firstMatch(text, [[PRIORITY_RX, () => true]]);
  if (prio) push(prio.m, { kind: "priority", label: "Prioritaire" }, () => (result.priority = "high"));
  const waiting = firstMatch(text, [[WAITING_RX, () => true]]);
  if (waiting) push(waiting.m, { kind: "waiting", label: "En attente" }, () => (result.waiting = true));
  const space = firstMatch(text, [[SPACE_RX, () => true]]);
  if (space) {
    // La requête garde la casse et les accents saisis.
    const query = src.slice(space.m.index + 1, space.m.index + space.m[0].length);
    push(space.m, { kind: "space", label: `#${query}` }, () => (result.spaceQuery = query));
  }

  // Ordre d'apparition dans la saisie ; un fragment chevauchant le précédent est ignoré.
  hits.sort((a, b) => a.start - b.start);
  let title = "";
  let cursor = 0;
  for (const hit of hits) {
    if (hit.start < cursor) continue;
    title += src.slice(cursor, hit.start) + " ";
    cursor = hit.end;
    hit.apply();
    result.tokens.push(hit.token);
  }
  title = (title + src.slice(cursor)).replace(/\s+/g, " ").trim();
  result.title = capitalize(title || src.trim());
  return result;
}

/** Espace correspondant : exact > commence par > contient (sans casse ni accents). */
export function matchSpace<T extends { name: string }>(query: string, spaces: T[]): T | undefined {
  const q = fold(query.trim());
  if (!q) return undefined;
  const names = spaces.map((s) => fold(s.name));
  const at = (test: (n: string) => boolean) => spaces[names.findIndex(test)];
  return at((n) => n === q) ?? at((n) => n.startsWith(q)) ?? at((n) => n.includes(q));
}

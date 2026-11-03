import { IconBell, IconCalendar, IconFlag, IconNotebook, IconSearch, IconSettings } from "./components/Icons";

export type MoreDestination = "reminders" | "week" | "carnet" | "search" | "brief" | "app-settings";

/**
 * Menu "Plus" (mobile) : destinations secondaires, libellées en langage
 * courant. Hub (indicateurs déclaratifs) et Approches métier (page
 * explicative) ont été retirés : jugés superflus pour un usage quotidien.
 */
export const MORE_LINKS: { key: MoreDestination; label: string; hint: string; Icon: typeof IconNotebook }[] = [
  { key: "week", label: "Cette semaine", hint: "Tout ce qui est prévu sur 7 jours", Icon: IconCalendar },
  { key: "reminders", label: "Relances", hint: "Ce que vous attendez des autres", Icon: IconBell },
  { key: "brief", label: "Mon Brief", hint: "Le point sur vos projets", Icon: IconFlag },
  { key: "carnet", label: "Notes", hint: "Idées à transformer en actions", Icon: IconNotebook },
  { key: "search", label: "Recherche", hint: "Retrouver une action", Icon: IconSearch },
  { key: "app-settings", label: "Réglages", hint: "Thème, compte, notifications", Icon: IconSettings },
];

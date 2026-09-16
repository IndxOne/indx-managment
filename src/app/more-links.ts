import { IconBell, IconCalendar, IconCompass, IconLayers, IconNotebook, IconSearch, IconSettings } from "./components/Icons";

export type MoreDestination = "week" | "reminders" | "carnet" | "hub" | "roles" | "search" | "app-settings";

/**
 * Renouveau produit v2.2 (Lot mobile-native) : la barre basse mobile se
 * resserre à 5 destinations (Aujourd'hui, RUN, création rapide, Projets,
 * Réglages) — "Cette semaine" et "Rappels" ne sont plus des onglets
 * primaires et rejoignent ce menu secondaire, aux côtés de
 * Carnet/Hub/Approches métier/Recherche/Réglages. Reste accessible sur
 * mobile via le déclencheur "•••" (écran "Plus") et, depuis Réglages, via
 * MoreSubNav — aucune de ces destinations ne disparaît.
 */
export const MORE_LINKS: { key: MoreDestination; label: string; Icon: typeof IconNotebook }[] = [
  { key: "week", label: "Cette semaine", Icon: IconCalendar },
  { key: "reminders", label: "Rappels", Icon: IconBell },
  { key: "carnet", label: "Carnet", Icon: IconNotebook },
  { key: "hub", label: "Hub", Icon: IconLayers },
  { key: "roles", label: "Approches métier", Icon: IconCompass },
  { key: "search", label: "Recherche", Icon: IconSearch },
  { key: "app-settings", label: "Réglages", Icon: IconSettings },
];

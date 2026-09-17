import { IconBell, IconCalendar, IconCompass, IconLayers, IconNotebook, IconSearch } from "./components/Icons";

// "app-settings" reste dans le type (utilisé par MoreSubNav pour marquer
// Réglages comme section active depuis AppSettingsScreen) mais n'a plus
// d'entrée dans MORE_LINKS : Réglages est désormais un onglet primaire de
// BottomNav, plus une destination du menu secondaire.
export type MoreDestination = "reminders" | "week" | "carnet" | "hub" | "roles" | "search" | "app-settings";

/**
 * Réglages est désormais un onglet primaire de BottomNav (5 emplacements —
 * Aujourd'hui/RUN/création rapide/Projets/Réglages, cadrage renouveau
 * mobile Lot A) : sa place ici disparaît. En échange, "Cette semaine" et
 * "Rappels" — qui occupaient deux des 4 anciens emplacements primaires —
 * rejoignent ce menu secondaire : aucune destination n'est perdue, seule sa
 * place change (mobile uniquement — desktop les garde en accès direct dans
 * la sidebar, cf. BottomNav.tsx).
 */
export const MORE_LINKS: { key: MoreDestination; label: string; Icon: typeof IconNotebook }[] = [
  { key: "reminders", label: "Rappels", Icon: IconBell },
  { key: "week", label: "Cette semaine", Icon: IconCalendar },
  { key: "carnet", label: "Carnet", Icon: IconNotebook },
  { key: "hub", label: "Hub", Icon: IconLayers },
  { key: "roles", label: "Approches métier", Icon: IconCompass },
  { key: "search", label: "Recherche", Icon: IconSearch },
];

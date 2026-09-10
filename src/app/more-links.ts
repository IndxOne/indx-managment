import { IconBell, IconCompass, IconLayers, IconNotebook, IconSearch, IconSettings } from "./components/Icons";

export type MoreDestination = "reminders" | "carnet" | "hub" | "roles" | "search" | "app-settings";

export const MORE_LINKS: { key: MoreDestination; label: string; Icon: typeof IconBell }[] = [
  { key: "reminders", label: "Rappels", Icon: IconBell },
  { key: "carnet", label: "Carnet", Icon: IconNotebook },
  { key: "hub", label: "Hub", Icon: IconLayers },
  { key: "roles", label: "Approches métier", Icon: IconCompass },
  { key: "search", label: "Recherche", Icon: IconSearch },
  { key: "app-settings", label: "Réglages", Icon: IconSettings },
];

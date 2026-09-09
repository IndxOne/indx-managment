import { IconBell, IconLayers, IconNotebook, IconSettings } from "./components/Icons";

export type MoreDestination = "reminders" | "carnet" | "hub" | "app-settings";

export const MORE_LINKS: { key: MoreDestination; label: string; Icon: typeof IconBell }[] = [
  { key: "reminders", label: "Rappels", Icon: IconBell },
  { key: "carnet", label: "Carnet", Icon: IconNotebook },
  { key: "hub", label: "Hub", Icon: IconLayers },
  { key: "app-settings", label: "Réglages", Icon: IconSettings },
];

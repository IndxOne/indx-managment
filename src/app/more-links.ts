import { IconCompass, IconLayers, IconNotebook, IconSearch, IconSettings } from "./components/Icons";

export type MoreDestination = "reminders" | "carnet" | "hub" | "roles" | "search" | "app-settings";

/**
 * Rappels est désormais un onglet primaire de BottomNav (Lot 1 du renouveau
 * produit) : plus besoin de son entrée ici, le menu secondaire ne garde que
 * Carnet/Hub/Approches métier/Recherche/Réglages.
 */
export const MORE_LINKS: { key: MoreDestination; label: string; Icon: typeof IconNotebook }[] = [
  { key: "carnet", label: "Carnet", Icon: IconNotebook },
  { key: "hub", label: "Hub", Icon: IconLayers },
  { key: "roles", label: "Approches métier", Icon: IconCompass },
  { key: "search", label: "Recherche", Icon: IconSearch },
  { key: "app-settings", label: "Réglages", Icon: IconSettings },
];

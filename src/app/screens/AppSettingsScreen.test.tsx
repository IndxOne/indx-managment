import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TemporaryStoreProvider } from "../adapters/temporary-store";
import { AppSettingsScreen } from "./AppSettingsScreen";

describe("AppSettingsScreen", () => {
  afterEach(() => localStorage.clear());

  it("signale l'absence de synchronisation quand Supabase n'est pas configuré", () => {
    // Les tests tournent toujours avec VITE_SUPABASE_URL vide (cf. vite.config.ts) :
    // seule la branche "persistance locale" est atteignable ici.
    render(
      <TemporaryStoreProvider>
        <AppSettingsScreen onNavigate={() => {}} />
      </TemporaryStoreProvider>
    );
    expect(screen.getByText("Persistance locale uniquement")).toBeInTheDocument();
  });

  // Le réglage "2e destination" (Semaine/Rappels) a été retiré (Lot 1.1 du
  // renouveau produit) : Rappels est désormais un onglet primaire toujours
  // visible, ce réglage n'avait plus aucun effet. Suppression documentée
  // comme conséquence du nouveau modèle de navigation, pas comme un reset
  // de préférence — l'ancienne clé localStorage peut rester chez les
  // utilisateurs sans conséquence, elle n'est simplement plus lue.
});

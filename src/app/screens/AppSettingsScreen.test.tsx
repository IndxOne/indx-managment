import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AppSettingsScreen } from "./AppSettingsScreen";

describe("AppSettingsScreen", () => {
  it("signale l'absence de synchronisation quand Supabase n'est pas configuré", () => {
    // Les tests tournent toujours avec VITE_SUPABASE_URL vide (cf. vite.config.ts) :
    // seule la branche "persistance locale" est atteignable ici.
    render(<AppSettingsScreen />);
    expect(screen.getByText("Persistance locale uniquement")).toBeInTheDocument();
  });
});

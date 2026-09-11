import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { TemporaryStoreProvider } from "../adapters/temporary-store";
import { getStoredSecondTabPreference } from "../utils/bottom-nav-preference";
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

  it("choisir \"Rappels\" persiste la préférence de 2e destination (Lot 3 §3)", async () => {
    const user = userEvent.setup();
    render(
      <TemporaryStoreProvider>
        <AppSettingsScreen onNavigate={() => {}} />
      </TemporaryStoreProvider>
    );
    expect(getStoredSecondTabPreference()).toBe("week");
    await user.click(screen.getByRole("radio", { name: "Rappels" }));
    expect(getStoredSecondTabPreference()).toBe("reminders");
  });
});

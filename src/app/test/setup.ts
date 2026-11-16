import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});

// Les tests historiques couvrent les vues d'origine : le mode minimal (activé par défaut en production)
// est désactivé ici et activé explicitement dans les tests du socle minimal.
import.meta.env.VITE_UX_MINIMAL = "off";

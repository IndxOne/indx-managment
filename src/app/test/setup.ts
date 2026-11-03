import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
  // Le mode local persiste dans localStorage : chaque test repart d'un état vierge.
  localStorage.clear();
});

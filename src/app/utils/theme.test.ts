import { afterEach, describe, expect, it } from "vitest";
import { applyThemePreference, getStoredThemePreference, setThemePreference } from "./theme";

afterEach(() => {
  localStorage.clear();
  delete document.documentElement.dataset.theme;
});

describe("theme preference", () => {
  it("par défaut, aucune préférence stockée : système", () => {
    expect(getStoredThemePreference()).toBe("system");
  });

  it("setThemePreference persiste et pose data-theme", () => {
    setThemePreference("dark");
    expect(getStoredThemePreference()).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("revenir à système retire data-theme", () => {
    setThemePreference("light");
    setThemePreference("system");
    expect(document.documentElement.dataset.theme).toBeUndefined();
  });

  it("applyThemePreference seul ne persiste rien", () => {
    applyThemePreference("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(getStoredThemePreference()).toBe("system");
  });
});

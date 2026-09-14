import { afterEach, describe, expect, it } from "vitest";
import { getOrCreateUserHash, setUserHash } from "./user-hash";

/**
 * Caractérisation du mécanisme d'identité actuel (Lot 0, préalable à
 * l'Auth Supabase OTP) : fige le comportement observé de
 * getOrCreateUserHash/setUserHash avant toute évolution. N'exerce que la
 * clé localStorage "indxone-projets:user-hash", jamais Supabase.
 */
describe("getOrCreateUserHash / setUserHash", () => {
  afterEach(() => localStorage.clear());

  it("génère un UUID et le persiste au premier appel (localStorage vide)", () => {
    expect(localStorage.getItem("indxone-projets:user-hash")).toBeNull();

    const hash = getOrCreateUserHash();

    expect(hash).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(localStorage.getItem("indxone-projets:user-hash")).toBe(hash);
  });

  it("est idempotent : deux appels successifs retournent la même valeur", () => {
    const first = getOrCreateUserHash();
    const second = getOrCreateUserHash();

    expect(second).toBe(first);
  });

  it("ne régénère rien si une valeur existe déjà en localStorage", () => {
    localStorage.setItem("indxone-projets:user-hash", "code-existant");

    expect(getOrCreateUserHash()).toBe("code-existant");
  });

  it("setUserHash écrase la valeur existante", () => {
    getOrCreateUserHash(); // génère un premier hash
    setUserHash("code-colle-depuis-un-autre-appareil");

    expect(getOrCreateUserHash()).toBe("code-colle-depuis-un-autre-appareil");
    expect(localStorage.getItem("indxone-projets:user-hash")).toBe("code-colle-depuis-un-autre-appareil");
  });

  it("setUserHash fonctionne même si aucun hash n'existait avant", () => {
    setUserHash("premier-code-jamais-genere-ici");

    expect(localStorage.getItem("indxone-projets:user-hash")).toBe("premier-code-jamais-genere-ici");
  });
});

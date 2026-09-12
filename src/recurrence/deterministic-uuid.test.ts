import { describe, expect, it } from "vitest";
import { uuidV5 } from "./deterministic-uuid";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("uuidV5", () => {
  it("reproduit le vecteur de test RFC 4122 (namespace DNS, 'www.example.org')", () => {
    // Vecteur connu et stable, utilisé pour valider toute implémentation UUID v5
    // (namespace DNS = 6ba7b810-9dad-11d1-80b4-00c04fd430c8).
    expect(uuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "www.example.org")).toBe(
      "74738ff5-5367-5958-9aee-98fffdcd1876"
    );
  });

  it("produit toujours un UUID syntaxiquement valide (version 5, variant RFC 4122)", () => {
    const id = uuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "n'importe quoi");
    expect(id).toMatch(UUID_RE);
  });

  it("est déterministe : même namespace + même nom => même UUID", () => {
    const a = uuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "rule-1:2026-09-08");
    const b = uuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "rule-1:2026-09-08");
    expect(a).toBe(b);
  });

  it("un nom différent produit un UUID différent", () => {
    const a = uuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "rule-1:2026-09-08");
    const b = uuidV5("6ba7b810-9dad-11d1-80b4-00c04fd430c8", "rule-1:2026-09-09");
    expect(a).not.toBe(b);
  });

  it("rejette un namespace mal formé", () => {
    expect(() => uuidV5("pas-un-uuid", "x")).toThrow();
  });
});

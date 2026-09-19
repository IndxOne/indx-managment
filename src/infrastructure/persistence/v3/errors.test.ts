import { describe, expect, it } from "vitest";
import { fromPostgrestError } from "./errors";

describe("fromPostgrestError", () => {
  it("42501 (RLS) devient une erreur d'autorisation", () => {
    const result = fromPostgrestError({ code: "42501", message: "new row violates row-level security policy" });
    expect(result).toEqual({ kind: "authorization", message: "new row violates row-level security policy" });
  });

  it("23503 (violation FK) devient une erreur de contrainte", () => {
    const result = fromPostgrestError({ code: "23503", message: "foreign key violation" });
    expect(result).toEqual({ kind: "persistence", code: "constraint_violation", message: "foreign key violation" });
  });

  it("23505 (violation unicité) devient une erreur de contrainte", () => {
    const result = fromPostgrestError({ code: "23505", message: "duplicate key" });
    expect(result).toEqual({ kind: "persistence", code: "constraint_violation", message: "duplicate key" });
  });

  it("code inconnu devient unknown, jamais une DomainError déguisée", () => {
    const result = fromPostgrestError({ code: "XX000", message: "erreur interne" });
    expect(result).toEqual({ kind: "persistence", code: "unknown", message: "erreur interne" });
  });
});

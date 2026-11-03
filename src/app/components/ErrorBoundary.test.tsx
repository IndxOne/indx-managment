import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ErrorBoundary } from "./ErrorBoundary";

function Boom(): never {
  throw new Error("rendu cassé");
}

describe("ErrorBoundary", () => {
  it("remplace une page blanche par un message clair et un bouton Recharger", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Vos données ne sont pas perdues");
    expect(screen.getByRole("button", { name: "Recharger" })).toBeInTheDocument();
    spy.mockRestore();
  });
});

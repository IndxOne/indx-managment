import { describe, expect, it } from "vitest";
import { isMinimalDemoRequested, isPreviewHost } from "./preview-host";

describe("hôtes de Preview / démo", () => {
  it("Previews Netlify et local autorisés, production et imitations refusées", () => {
    expect(isPreviewHost("deploy-preview-84--indxone-projets.netlify.app")).toBe(true);
    expect(isPreviewHost("localhost")).toBe(true);
    for (const h of ["projets.indxone.com", "evil.com", "deploy-preview-1--x.evil.com", "deploy-preview-1--x.netlify.app.evil.com"]) expect(isPreviewHost(h)).toBe(false);
  });
  it("démo : paramètre explicite et hôte autorisé requis", () => {
    expect(isMinimalDemoRequested({ hostname: "localhost", search: "?ux-demo=minimal" })).toBe(true);
    expect(isMinimalDemoRequested({ hostname: "localhost", search: "" })).toBe(false);
    expect(isMinimalDemoRequested({ hostname: "projets.indxone.com", search: "?ux-demo=minimal" })).toBe(false);
  });
});

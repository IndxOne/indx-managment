import { describe, expect, it } from "vitest";
import { isUxDemoRequested } from "./ux-v22";

describe("isUxDemoRequested — démo fictive jamais en production", () => {
  it("refuse sur un domaine de production, même avec le paramètre", () => {
    expect(isUxDemoRequested({ hostname: "projets.indxone.com", search: "?ux-demo=v22" })).toBe(false);
  });
  it("refuse sans paramètre explicite", () => {
    expect(isUxDemoRequested({ hostname: "localhost", search: "" })).toBe(false);
  });
  it("accepte Preview Netlify et local avec ?ux-demo=v22", () => {
    expect(isUxDemoRequested({ hostname: "deploy-preview-83--indxone-projets.netlify.app", search: "?ux-demo=v22" })).toBe(true);
    expect(isUxDemoRequested({ hostname: "localhost", search: "?ux-demo=v22" })).toBe(true);
  });
  it("refuse un hôte qui imite une Preview", () => {
    expect(isUxDemoRequested({ hostname: "evil.com", search: "?ux-demo=v22" })).toBe(false);
    expect(isUxDemoRequested({ hostname: "deploy-preview-1--x.evil.com", search: "?ux-demo=v22" })).toBe(false);
  });
});

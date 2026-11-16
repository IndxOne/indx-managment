import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LazyMinimalDemo } from "./demo";
import { isMinimalDemoRequested } from "./minimal/preview-host";
import "./styles/global.css";
import "./styles/management-minimal.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Élément racine #root introuvable");
}

// Démo fictive isolée (Preview/local + ?ux-demo=minimal) : chargée à part, sans store ni Supabase.
createRoot(container).render(
  <StrictMode>
    {isMinimalDemoRequested() ? (
      <Suspense fallback={null}>
        <LazyMinimalDemo />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
);

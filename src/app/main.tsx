import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { LazyV22Demo } from "./demo";
import { isUxDemoRequested } from "./ux-v22";
import "./styles/global.css";
import "./styles/management-v22.css";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Élément racine #root introuvable");
}

// Démo fictive isolée (Preview/local + ?ux-demo=v22) : chargée à part, sans store ni Supabase.
createRoot(container).render(
  <StrictMode>
    {isUxDemoRequested() ? (
      <Suspense fallback={null}>
        <LazyV22Demo />
      </Suspense>
    ) : (
      <App />
    )}
  </StrictMode>
);

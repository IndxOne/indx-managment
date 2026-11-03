import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles/global.css";

/** Moment de la journée → lumière ambiante (cf. :root[data-moment] dans global.css). */
function applyMoment() {
  const hour = new Date().getHours();
  document.documentElement.dataset.moment = hour < 5 || hour >= 21 ? "nuit" : hour < 10 ? "aube" : hour < 17 ? "jour" : "soir";
}
applyMoment();
window.setInterval(applyMoment, 15 * 60 * 1000);

const container = document.getElementById("root");
if (!container) {
  throw new Error("Élément racine #root introuvable");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);

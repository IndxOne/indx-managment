/* global localStorage, document */
// Applique le thème choisi (Réglages) avant le premier rendu React : évite un
// flash clair pour une préférence "sombre". Fichier externe (pas de script
// inline) pour rester compatible avec la Content-Security-Policy stricte.
try {
  var theme = localStorage.getItem("indxone-theme-preference");
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
} catch {
  // Stockage indisponible (navigation privée) : thème système par défaut.
}

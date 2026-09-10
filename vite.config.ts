/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // "prompt" (pas "autoUpdate") : un nouveau déploiement ne doit jamais
      // faire main basse sur un onglet déjà ouvert (skipWaiting +
      // clientsClaim immédiats) pendant qu'un formulaire est en cours de
      // saisie. Sans code d'invite personnalisé ni appel à
      // updateServiceWorker(), le nouveau service worker reste simplement
      // en attente jusqu'à ce que tous les onglets du site soient fermés —
      // comportement standard du navigateur, sans risque de perte de saisie.
      registerType: "prompt",
      includeAssets: ["icons/favicon-48.png"],
      manifest: {
        name: "INDXONE Projets",
        short_name: "Projets",
        description: "Gestion d'actions et de projets RUN/PROJET, mobile et desktop.",
        lang: "fr",
        // id/scope/categories/screenshots : exigés ou notés par PWABuilder
        // pour l'empaquetage Play Store / App Store (cf. docs/stores.md).
        id: "/",
        scope: "/",
        start_url: "/",
        display: "standalone",
        categories: ["productivity", "business"],
        background_color: "#f2f2f7",
        theme_color: "#007aff",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        screenshots: [
          { src: "screenshots/mobile-projet.png", sizes: "810x1440", type: "image/png", form_factor: "narrow", label: "Espace PROJET : décisions, risques, actions par phase" },
          { src: "screenshots/desktop-kanban.png", sizes: "1920x1080", type: "image/png", form_factor: "wide", label: "Kanban desktop par phase avec barre latérale des espaces" },
        ],
      },
      workbox: {
        // Coquille app-shell uniquement : les données viennent de Supabase
        // (ou de l'adaptateur mémoire), jamais mises en cache ici — ce
        // service worker ne sert qu'à rendre l'app installable et à
        // permettre un démarrage hors-ligne du shell, pas à fonctionner
        // sans réseau (l'app n'a pas de mode offline pour ses données).
        globPatterns: ["**/*.{js,css,html,svg,png,ico,webmanifest}"],
        // Gestionnaires push/notificationclick (src/app/public/sw-push.js).
        importScripts: ["sw-push.js"],
        // Captures réservées aux fiches store : inutiles hors ligne.
        globIgnores: ["screenshots/**"],
      },
    }),
  ],
  root: "src/app",
  // envDir hérite de `root` par défaut : sans ce chemin explicite, Vite
  // cherche .env.local dans src/app/ au lieu de la racine du repo (où
  // .env.example et .gitignore l'attendent), et VITE_SUPABASE_* reste vide.
  envDir: "../..",
  publicDir: "public",
  build: {
    outDir: "../../dist",
    emptyOutDir: true,
  },
  test: {
    root: ".",
    environment: "jsdom",
    setupFiles: ["./src/app/test/setup.ts"],
    globals: false,
    // Les tests exercent toujours l'adaptateur mémoire, jamais Supabase,
    // même si .env.local est présent en local (isSupabaseConfigured() doit
    // rester faux ici, quel que soit le poste sur lequel les tests tournent).
    env: {
      VITE_SUPABASE_URL: "",
      VITE_SUPABASE_PUBLISHABLE_KEY: "",
    },
  },
});

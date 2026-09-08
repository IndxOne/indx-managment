/// <reference types="vitest/config" />
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  root: "src/app",
  publicDir: false,
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

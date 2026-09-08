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
  },
});

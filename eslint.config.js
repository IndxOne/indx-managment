import js from "@eslint/js";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "node_modules"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    files: ["**/*.test.{ts,tsx}", "src/app/test/**"],
    languageOptions: { globals: globals.node },
    rules: {
      // Les fixtures de test reproduisent volontairement des comportements natifs (ex. autoFocus) pour les régressions ciblées.
      "jsx-a11y/no-autofocus": "off",
    },
  },
  {
    // Modules contexte/store : exportent volontairement un composant Provider et un hook (useX) côte à côte.
    files: ["src/app/adapters/*.tsx", "src/app/a11y/announcer.tsx"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  }
);

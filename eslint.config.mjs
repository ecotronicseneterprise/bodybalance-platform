// Root ESLint config for the BodyBalance Platform monorepo (BLUEPRINT.md v1.0).
// Lints TypeScript across apps/ and packages/. Framework-specific rules can be
// layered per-app later if needed; this baseline must always pass.
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/.next/**",
      "**/out/**",
      "**/next-env.d.ts",
      "venv/**",
      "legacy/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Domain rule support (BLUEPRINT 4.2): flag accidental `any` that would
      // weaken the typed boundary between AI tools and domain services.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
);

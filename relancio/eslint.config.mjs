import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Composants shadcn/ui officiels (code tiers, non modifié)
    files: ["src/components/ui/**", "src/hooks/use-mobile.ts"],
    rules: { "react-hooks/purity": "off", "react-hooks/set-state-in-effect": "off" },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "src/lib/db/database.types.ts",
    ".shot.mjs",
  ]),
]);

export default eslintConfig;

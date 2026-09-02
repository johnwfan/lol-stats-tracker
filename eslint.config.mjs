import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";

const eslintConfig = defineConfig([
  ...nextVitals,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Python ML directories -- not part of the Next.js app, and their
    // .venv/ subfolders bundle huge vendored JS (Jupyter widgets, plotly)
    // that isn't meant to be linted here.
    "ml/**",
    "ml-service/**",
  ]),
]);

export default eslintConfig;

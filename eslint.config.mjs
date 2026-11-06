import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    // Release output from `npm run build:release` (minified, generated).
    "dist/**",
    "coverage/**",
    "next-env.d.ts",
    // Gitignored build/test artifacts (legacy Vite output, release bundles,
    // Playwright reports) — generated code, not source.
    "dist/**",
    "dist-ssr/**",
    "test-results/**",
    "playwright-report/**",
    ".media-storage/**",
  ]),
]);

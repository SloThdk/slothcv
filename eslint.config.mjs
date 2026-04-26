/**
 * ESLint flat config for slothcv.
 *
 * Next 16 removed the bundled `next lint` command, so we run ESLint
 * directly. `eslint-config-next` v16 already exports flat-format configs,
 * so we can spread them in without the legacy FlatCompat shim.
 */

import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      ".open-next/**",
      "out/**",
      "node_modules/**",
      "next-env.d.ts",
      "cloudflare-env.d.ts",
    ],
  },
];

export default eslintConfig;

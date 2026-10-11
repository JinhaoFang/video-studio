/**
 * Keep Remotion's recommended rules on browser code, and use its shared JS/TS
 * rules on Node tools, studio skill scripts, and root configuration files.
 * tools/code-files.ts determines the verification input independently of ESLint.
 */
import { config } from "@remotion/eslint-config-flat";

const code = ["**/*.{ts,tsx,js,mjs,cjs}"];
const browser = [
  "src/**/*.{ts,tsx,js,mjs,cjs}",
  "episodes/**/*.{ts,tsx,js,mjs,cjs}",
];
const node = [
  "tools/**/*.{ts,js,mjs,cjs}",
  ".claude/skills/studio-*/**/*.{ts,js,mjs,cjs}",
  "*.{ts,js,mjs,cjs}",
];
const nodeGlobals = Object.fromEntries(
  Object.getOwnPropertyNames(globalThis).map((name) => [name, "readonly"]),
);

export default [
  {
    ignores: ["!**/node_modules/", "!**/node_modules/**"],
  },
  ...config
    .filter((entry) => !entry.ignores)
    .map((entry) => ({
      ...entry,
      files:
        entry.plugins?.react || entry.plugins?.["@remotion"]
          ? browser
          : (entry.files ?? code),
    })),
  {
    files: browser,
    languageOptions: {
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        console: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        fetch: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
  },
  {
    files: node,
    languageOptions: { globals: nodeGlobals },
  },
  {
    files: ["**/*.cjs"],
    languageOptions: {
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
      },
    },
  },
];

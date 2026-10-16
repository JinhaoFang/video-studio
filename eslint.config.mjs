/**
 * Keep Remotion's recommended rules on browser code, and use its shared JS/TS
 * rules on Node tools, repository-owned skill scripts, and root configuration files.
 * tools/code-files.ts determines the verification input independently of ESLint.
 * Browser code may not use SVG <image>: Remotion does not wait for it to load, so
 * parallel renders drop frames (#74); use Remotion <Img> inside a sized container.
 */
import { config } from "@remotion/eslint-config-flat";

const code = ["**/*.{ts,tsx,js,mjs,cjs}"];
const browser = [
  "src/**/*.{ts,tsx,js,mjs,cjs}",
  "episodes/**/*.{ts,tsx,js,mjs,cjs}",
];
const node = [
  "tools/**/*.{ts,js,mjs,cjs}",
  ".claude/skills/run-spec/**/*.{ts,js,mjs,cjs}",
  "*.{ts,js,mjs,cjs}",
];
const nodeGlobals = Object.fromEntries(
  Object.getOwnPropertyNames(globalThis).map((name) => [name, "readonly"]),
);

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/out/**",
      "references/**",
      ".codex-runs/**",
      ".agents/**",
      ".claude/skills/*/**",
      "!.claude/skills/run-spec/**",
    ],
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
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXOpeningElement[name.name='image']",
          message:
            "SVG <image> 不等加载，并行渲染会缺帧；改用 remotion 的 <Img> 放进定尺寸容器裁切。",
        },
      ],
    },
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

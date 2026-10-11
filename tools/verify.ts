/**
 * Run repository verification with `pnpm verify`: ESLint, browser and Node
 * TypeScript checks, then every first-party .test.ts file via node:test.
 * Tests live in the Node type-checking environment, including browser folders.
 * An empty test set succeeds without starting Node's broader test discovery.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { listCodeFiles } from "./code-files.ts";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);

const run = (label: string, args: string[]): void => {
  console.log(`\n[verify] ${label}`);
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: "inherit",
  });
  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
};

const files = listCodeFiles(root);
const eslint = join(
  dirname(require.resolve("eslint/package.json")),
  "bin/eslint.js",
);
const tsc = join(
  dirname(require.resolve("typescript/package.json")),
  "bin/tsc",
);

if (files.length > 0) {
  run(`eslint (${files.length} files)`, [eslint, "--", ...files]);
}
run("tsc (browser)", [tsc, "--project", "tsconfig.json"]);
run("tsc (Node)", [tsc, "--project", "tools/tsconfig.json"]);

const tests = files.filter((path) => path.endsWith(".test.ts"));
if (tests.length > 0) {
  run(`node:test (${tests.length} files)`, ["--test", ...tests]);
} else {
  console.log("\n[verify] node:test (0 files, skipped)");
}

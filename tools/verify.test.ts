/**
 * Exercise ESLint's directory defaults and verify's explicit Git file scope in
 * temporary repositories. Real CLI runs prove ignored tracked files are checked
 * without making direct `eslint .` traverse generated or third-party code.
 * Run with `node --test tools/verify.test.ts` or `pnpm verify`.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

const repository = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const eslint = join(
  dirname(require.resolve("eslint/package.json")),
  "bin/eslint.js",
);
const ignored = [
  "src/kit/build/ignored.ts",
  "dist/ignored.ts",
  "out/ignored.ts",
  "references/ignored.ts",
  ".codex-runs/ignored.ts",
  ".agents/ignored.ts",
  ".claude/skills/third-party/ignored.ts",
  "vendor/node_modules/ignored.ts",
];

const fixture = (context: TestContext): string => {
  const root = mkdtempSync(join(tmpdir(), "studio-verify-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  symlinkSync(
    join(repository, "node_modules"),
    join(root, "node_modules"),
    "dir",
  );
  copyFileSync(
    join(repository, "eslint.config.mjs"),
    join(root, "eslint.config.mjs"),
  );
  writeFileSync(
    join(root, ".gitignore"),
    "build\ndist\nout\nreferences\n.codex-runs\n.agents\n.claude/skills/third-party\nnode_modules\n",
  );
  for (const path of ignored) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), "export const = ;");
  }
  return root;
};

test("direct eslint ignores generated and third-party directories but checks studio skills", (context) => {
  const root = fixture(context);
  const clean = spawnSync(process.execPath, [eslint, "."], {
    cwd: root,
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(clean.error, undefined);
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  const studio = join(root, ".claude/skills/studio-fixture/script.ts");
  mkdirSync(dirname(studio), { recursive: true });
  writeFileSync(studio, "export const = ;");
  const invalid = spawnSync(process.execPath, [eslint, "."], {
    cwd: root,
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(invalid.error, undefined);
  assert.equal(invalid.status, 1);
  assert.match(invalid.stdout, /studio-fixture\/script\.ts/);
  assert.match(invalid.stdout, /Parsing error/);
});

test("verify checks tracked ignored code through eslint without scanning ignored untracked files", (context) => {
  const root = fixture(context);
  mkdirSync(join(root, "tools"));
  for (const path of [
    "tools/verify.ts",
    "tools/code-files.ts",
    "tools/check-guardrails.ts",
  ]) {
    copyFileSync(join(repository, path), join(root, path));
  }
  const tracked = "src/kit/build/tracked.ts";
  writeFileSync(join(root, tracked), "export const = ;");
  execFileSync("git", ["add", "--force", "--", tracked], { cwd: root });
  const result = spawnSync(process.execPath, ["tools/verify.ts"], {
    cwd: root,
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(result.error, undefined);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /\[verify\] eslint/);
  assert.match(result.stdout, /src\/kit\/build\/tracked\.ts/);
  assert.match(result.stdout, /Parsing error/);
  assert.doesNotMatch(
    result.stdout + result.stderr,
    /ignored\.ts|\[verify\] tsc/,
  );
});

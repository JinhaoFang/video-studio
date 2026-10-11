/**
 * Exercise ESLint's directory defaults and verify's explicit Git file scope in
 * temporary repositories, including owned skill scripts/tests and Node types.
 * Real CLI runs prove ignored tracked files are checked
 * without making direct `eslint .` traverse generated or third-party code.
 * Run with `node --test tools/verify.test.ts` or `pnpm verify`.
 */
import assert from "node:assert/strict";
import {
  commandOutput as execFileSync,
  runCommand as spawnSync,
  gitRepository,
} from "./test-support.ts";
import { copyFileSync, mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
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
  ".claude/skills/studio-fixture/ignored.ts",
  "vendor/node_modules/ignored.ts",
];

const fixture = (context: TestContext): string => {
  const { root } = gitRepository(context);
  symlinkSync(
    join(repository, "node_modules"),
    join(root, "node_modules"),
    "dir",
  );
  copyFileSync(
    join(repository, "eslint.config.mjs"),
    join(root, "eslint.config.mjs"),
  );
  copyFileSync(join(repository, ".gitignore"), join(root, ".gitignore"));
  for (const path of ignored) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), "export const = ;");
  }
  return root;
};

test("direct eslint ignores generated and third-party directories but checks run-spec scripts and tests", (context) => {
  const root = fixture(context);
  const clean = spawnSync(process.execPath, [eslint, "."], {
    cwd: root,
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(clean.error, undefined);
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
  const paths = [
    ".claude/skills/run-spec/scripts/script.ts",
    ".claude/skills/run-spec/scripts/script.test.ts",
  ];
  for (const path of paths) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), "export const = ;");
  }
  const invalid = spawnSync(process.execPath, [eslint, "."], {
    cwd: root,
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(invalid.error, undefined);
  assert.equal(invalid.status, 1);
  for (const path of paths)
    assert.ok(invalid.stdout.includes(path), invalid.stdout);
  assert.match(invalid.stdout, /Parsing error/);
});

test("Node type checking includes run-spec scripts and tests while excluding other skills", (context) => {
  const root = fixture(context);
  mkdirSync(join(root, "tools"));
  for (const path of ["tsconfig.json", "tools/tsconfig.json"]) {
    copyFileSync(join(repository, path), join(root, path));
  }
  const paths = [
    ".claude/skills/run-spec/scripts/script.ts",
    ".claude/skills/run-spec/scripts/script.test.ts",
  ];
  for (const path of paths) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), "export const invalid: string = 1;");
  }
  const tsc = join(
    dirname(require.resolve("typescript/package.json")),
    "bin/tsc",
  );
  const result = spawnSync(
    process.execPath,
    [tsc, "--project", "tools/tsconfig.json"],
    {
      cwd: root,
      encoding: "utf8",
      timeout: 15000,
    },
  );
  assert.equal(result.error, undefined);
  assert.equal(result.status, 2, result.stdout + result.stderr);
  for (const path of paths)
    assert.ok(result.stdout.includes(path), result.stdout);
  assert.match(result.stdout, /TS2322/);
  assert.doesNotMatch(result.stdout + result.stderr, /ignored\.ts/);
});

test("verify checks tracked ignored code through eslint without scanning ignored untracked files", (context) => {
  const root = fixture(context);
  mkdirSync(join(root, "tools"));
  for (const path of [
    "tools/verify.ts",
    "tools/code-files.ts",
    "tools/check-guardrails.ts",
    "tools/cli.ts",
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

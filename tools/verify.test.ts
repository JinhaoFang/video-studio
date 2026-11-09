/**
 * Exercise ESLint's directory defaults and verify's explicit Git file scope in
 * temporary repositories; installed skills stay out of ESLint and Node types.
 * Real CLI runs prove ignored tracked files are checked
 * without making direct `eslint .` traverse generated or third-party code,
 * that `--static` stops before tests, and that bad arguments exit 2.
 * Isolated test repositories also cover suite, assertion and import failures,
 * while successful, skipped and TODO tests retain Node's normal semantics.
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
  ".claude/skills/run-spec/scripts/ignored.ts",
  ".claude/skills/setup-run-spec/scripts/ignored.ts",
  "vendor/node_modules/ignored.ts",
];

const fixture = (context: TestContext): string => {
  const { root } = gitRepository(context);
  symlinkSync(
    join(repository, "node_modules"),
    join(root, "node_modules"),
    "junction",
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

test("direct eslint ignores generated, third-party and installed skill directories", (context) => {
  const root = fixture(context);
  const clean = spawnSync(process.execPath, [eslint, "."], {
    cwd: root,
    encoding: "utf8",
    timeout: 15000,
  });
  assert.equal(clean.error, undefined);
  assert.equal(clean.status, 0, clean.stdout + clean.stderr);
});

test("Node type checking covers tools and their tests but not installed skills", (context) => {
  const root = fixture(context);
  mkdirSync(join(root, "tools"));
  for (const path of ["tsconfig.json", "tools/tsconfig.json"]) {
    copyFileSync(join(repository, path), join(root, path));
  }
  const paths = ["tools/script.ts", "tools/script.test.ts"];
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
  assert.match(result.stdout, /src[\\/]kit[\\/]build[\\/]tracked\.ts/);
  assert.match(result.stdout, /Parsing error/);
  assert.doesNotMatch(
    result.stdout + result.stderr,
    /ignored\.ts|\[verify\] tsc/,
  );
});

const staticFixture = (context: TestContext) => {
  const { root } = gitRepository(context);
  symlinkSync(
    join(repository, "node_modules"),
    join(root, "node_modules"),
    "junction",
  );
  for (const path of [
    ".gitignore",
    "package.json",
    "tsconfig.json",
    "eslint.config.mjs",
    "tools/tsconfig.json",
    "tools/verify.ts",
    "tools/code-files.ts",
    "tools/cli.ts",
    "tools/check-guardrails.ts",
    "tools/check-doc-commands.ts",
  ]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    copyFileSync(join(repository, path), join(root, path));
  }
  mkdirSync(join(root, "src"));
  writeFileSync(join(root, "src/probe.ts"), "export const probe = 1;\n");
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  const run = (args: string[]) =>
    spawnSync(process.execPath, ["tools/verify.ts", ...args], {
      cwd: root,
      encoding: "utf8",
      env,
      timeout: 60000,
    });
  return { root, run };
};

test("static verification runs every check but never executes tests", (context) => {
  const { root, run } = staticFixture(context);
  writeFileSync(
    join(root, "tools/probe.test.ts"),
    "throw new Error('测试不应运行');\n",
  );
  const result = run(["--static"]);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  for (const step of [
    "eslint",
    "tsc (browser)",
    "tsc (Node)",
    "comment position",
    "dependency direction",
    "规则文档命令存在性",
    "静态检查通过",
  ])
    assert.ok(result.stdout.includes(`[verify] ${step}`), result.stdout);
  assert.doesNotMatch(result.stdout + result.stderr, /node:test|测试不应运行/);
  writeFileSync(
    join(root, "tools/probe.test.ts"),
    "export const invalid: string = 1;\n",
  );
  const invalid = run(["--static"]);
  assert.equal(invalid.status, 2, invalid.stdout + invalid.stderr);
  assert.match(invalid.stdout, /TS2322/);
});

for (const scenario of [
  {
    name: "suite callback throws synchronously without registering tests",
    source:
      'import { describe } from "node:test";\ndescribe("suite-sync-throw", () => { throw new Error("suite callback failed"); });\n',
    diagnostics: [/suite-sync-throw/, /suite callback failed/],
  },
  {
    name: "an assertion fails inside it",
    source:
      'import assert from "node:assert/strict";\nimport { describe, it } from "node:test";\ndescribe("assertion-suite", () => { it("assertion-failure", () => { assert.equal(1, 2); }); });\n',
    diagnostics: [/assertion-suite/, /assertion-failure/, /ERR_ASSERTION/],
  },
  {
    name: "a top-level import cannot resolve its module",
    source: 'import "./missing-module.js";\n',
    diagnostics: [/ERR_MODULE_NOT_FOUND/, /missing-module\.js/],
  },
]) {
  test(`verification fails when ${scenario.name}`, (context) => {
    const { root, run } = staticFixture(context);
    writeFileSync(join(root, "tools/failure.test.ts"), scenario.source);
    const result = run([]);
    const output = result.stdout + result.stderr;
    assert.equal(result.error, undefined);
    assert.equal(result.status, 1, output);
    assert.match(output, /\[verify\] node:test \(1 files\)/);
    assert.match(output, /failure\.test\.ts/);
    for (const diagnostic of scenario.diagnostics)
      assert.match(output, diagnostic);
  });
}

test("verification runs every selected test and accepts skips and TODO failures", (context) => {
  const { root, run } = staticFixture(context);
  writeFileSync(
    join(root, "tools/passing.test.ts"),
    'import { describe, it } from "node:test";\ndescribe("passing-suite", () => { it("passes", () => { console.log("not ok 1 - ordinary test output"); }); it.skip("skipped", () => { throw new Error("must not run"); }); it("pending", { todo: "not implemented" }, () => { throw new Error("expected TODO failure"); }); });\n',
  );
  writeFileSync(
    join(root, "tools/another.test.ts"),
    'import { it } from "node:test";\nit("another file runs", () => {});\n',
  );
  const result = run([]);
  const output = result.stdout + result.stderr;
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, output);
  assert.match(output, /\[verify\] node:test \(2 files\)/);
  assert.match(output, /another file runs/);
  assert.match(output, /passing-suite/);
  assert.match(output, /# tests 4/);
  assert.match(output, /# pass 2/);
  assert.match(output, /# fail 0/);
  assert.match(output, /# skipped 1/);
  assert.match(output, /# todo 1/);
});

test("verification help and invalid arguments exit before any check", (context) => {
  const { run } = staticFixture(context);
  const help = run(["--help"]);
  assert.equal(help.status, 0, help.stderr);
  assert.match(help.stdout, /用法：pnpm verify.*--static/);
  for (const args of [["--unknown"], ["extra"]]) {
    const result = run(args);
    assert.equal(result.status, 2, result.stderr);
    assert.match(result.stderr, /^出错：/);
    assert.doesNotMatch(result.stdout, /\[verify\]/);
  }
});

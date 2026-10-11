/**
 * Check guardrail CLI behavior with code fixtures in temporary Git repositories.
 * Assert exit codes, diagnostics and allowed syntax rather than AST internals.
 * Run with `node --test tools/check-guardrails.test.ts` or `pnpm verify`.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

const script = resolve(import.meta.dirname, "check-guardrails.ts");

const fixture = (
  context: TestContext,
  files: Record<string, string>,
): string => {
  const root = mkdtempSync(join(tmpdir(), "studio-guardrails-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  for (const [path, text] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  return root;
};

const run = (root: string, mode: string) =>
  spawnSync(process.execPath, [script, mode, root], { encoding: "utf8" });

test("comments allow separate header blocks, shebangs, no headers and tool directives", (context) => {
  const root = fixture(context, {
    "header.ts":
      "#!/usr/bin/env node\n// Header one\n\n/* Header two */\n/** Header three */\nexport {};\n",
    "empty.js": "// Only a header\n/* More header */\n",
    "bare.mjs": "export {};\n",
    "directives.ts": [
      "export {};",
      "/* eslint-disable no-unused-vars */",
      "/* eslint-enable no-unused-vars */",
      "// eslint-disable-next-line no-unused-vars",
      "const value = 1; // eslint-disable-line no-unused-vars",
      "const inline = 1; /* eslint-disable-line no-unused-vars */",
      "/* eslint-disable-next-line no-unused-vars */",
      "const other = 2;",
      "// @ts-expect-error Reason",
      "const result: string = 3;",
      "/* @ts-expect-error Reason */",
      "const last: string = 4;",
      "// @ts-expect-error: Reason",
      "const colon: string = 5;",
      "/// @ts-expect-error: Reason",
      "const triple: string = 6;",
      "/* @ts-expect-error: Reason */",
      "const block: string = 7;",
      "/** @ts-expect-error: Reason */",
      "const jsdoc: string = 8;",
      "/*\n * @ts-expect-error: Reason */",
      "const multiline: string = 9;",
    ].join("\n"),
    "view.tsx":
      "const view = <div>{/* eslint-disable-next-line rule */}</div>;\n",
  });
  const result = run(root, "comments");
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, "");
});

test("comment-like text in strings, regexps, JSX and template literals is allowed", (context) => {
  const root = fixture(context, {
    "literals.tsx": [
      'const url = "https://example.test/* text */";',
      "const pattern = /https?:\\/\\/[^/]+/;",
      'const template = `/* plain text */ ${"// text"} // tail`; ',
      'const view = <div> // plain JSX text /* plain text */ <span title="/* text */" /></div>;',
    ].join("\n"),
  });
  const result = run(root, "comments");
  assert.equal(result.status, 0, result.stderr);
});

for (const [name, path, code, line] of [
  ["standalone line comment", "sample.ts", "export {};\n// explanation\n", 2],
  ["trailing comment", "sample.js", "const value = 1; // explanation\n", 1],
  ["block comment", "sample.mjs", "export {};\n/* explanation */\n", 2],
  [
    "multiline block",
    "sample.cjs",
    "module.exports = {};\n/* explanation\n continued */\n",
    2,
  ],
  [
    "JSX comment",
    "sample.tsx",
    "const view = <div>\n{/* explanation */}\n</div>;",
    2,
  ],
  [
    "JSX child comment",
    "sample.tsx",
    "const view = <div>{\n// explanation\n1}</div>;",
    2,
  ],
  [
    "template expression comment",
    "sample.ts",
    "const text = `${\n/* explanation */ 1}`;",
    2,
  ],
  [
    "misplaced JSDoc",
    "sample.ts",
    "export {};\n/** explanation */\nconst value = 1;",
    2,
  ],
  ["unsupported directive", "sample.ts", "export {};\n// @ts-ignore\n", 2],
  [
    "line eslint-disable is not an ESLint directive",
    "sample.ts",
    "export {};\n// eslint-disable explanation\n",
    2,
  ],
  [
    "invalid ESLint directive suffix",
    "sample.ts",
    "export {};\n// eslint-disable-next-lines rule\n",
    2,
  ],
  [
    "TypeScript directive before the last block line",
    "sample.ts",
    "export {};\n/* @ts-expect-error: Reason\n */\nconst value: string = 1;",
    2,
  ],
  [
    "multiline eslint-disable-line is not applied by ESLint",
    "sample.ts",
    "export {};\n/* eslint-disable-line rule\n */\n",
    2,
  ],
  [
    "eslint-enable directive",
    "sample.ts",
    "export {};\n// eslint-enable rule\n",
    2,
  ],
  [
    "directive mentioned in prose",
    "sample.ts",
    "export {};\n// explanation about @ts-expect-error\n",
    2,
  ],
] as const) {
  test(`comments reject ${name} with file and line`, (context) => {
    const result = run(fixture(context, { [path]: code }), "comments");
    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      new RegExp(
        `^${path.replaceAll(".", "\\.")}:${line} comment-position .+\\n$`,
      ),
    );
  });
}

const episode = { "episodes/demo/index.ts": "export const value = 1;" };

for (const [name, code] of [
  ["relative import", 'import { value } from "../episodes/demo/index.ts";'],
  ["relative export", 'export { value } from "../episodes/demo/index.ts";'],
  ["export all", 'export * from "../episodes/demo/index.ts";'],
  ["dynamic import", 'const loaded = import("../episodes/demo/index.ts");'],
  [
    "dynamic template import",
    "const loaded = import(`../episodes/demo/index.ts`);",
  ],
  [
    "dynamic template import with fixed prefix",
    "const loaded = import(`../episodes/${ep}/index.ts`);",
  ],
  [
    "normalized dynamic template prefix",
    "const loaded = import(`../src/../episodes/${ep}/index.ts`);",
  ],
  [
    "triple-slash path reference",
    '/// <reference path="../episodes/demo/index.ts" />\nexport {};',
  ],
  ["require", 'const loaded = require("../episodes/demo/index.ts");'],
  ["import equals", 'import loaded = require("../episodes/demo/index.ts");'],
  ["import type", 'type Loaded = typeof import("../episodes/demo/index.ts");'],
  ["root specifier", 'import "episodes/demo/index.ts";'],
  ["path normalization", 'import "../src/../episodes/demo/index.ts";'],
  ["missing episode file", 'import "../episodes/missing.ts";'],
] as const) {
  test(`dependencies reject ${name} from both method-layer directories`, (context) => {
    const result = run(
      fixture(context, {
        ...episode,
        "src/sample.ts": code,
        "tools/sample.ts": code,
      }),
      "dependencies",
    );
    assert.equal(result.status, 1);
    assert.match(result.stderr, /^src\/sample\.ts:1 dependency-direction .+$/m);
    assert.match(
      result.stderr,
      /^tools\/sample\.ts:1 dependency-direction .+$/m,
    );
    assert.equal(result.stderr.trim().split("\n").length, 2);
  });
}

test("dependencies resolve absolute paths, baseUrl and tsconfig paths aliases", (context) => {
  const root = fixture(context, {
    ...episode,
    "tsconfig.json": JSON.stringify({
      compilerOptions: {
        baseUrl: ".",
        paths: { "@episode/*": ["episodes/*"] },
      },
    }),
    "src/alias.ts": 'import "@episode/demo/index";',
    "tools/base-url.ts": 'export * from "episodes/demo/index";',
  });
  writeFileSync(
    join(root, "tools/absolute.ts"),
    `import ${JSON.stringify(join(root, "episodes/demo/index.ts"))};`,
  );
  const result = run(root, "dependencies");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^src\/alias\.ts:1 dependency-direction .+$/m);
  assert.match(
    result.stderr,
    /^tools\/base-url\.ts:1 dependency-direction .+$/m,
  );
  assert.match(
    result.stderr,
    /^tools\/absolute\.ts:1 dependency-direction .+$/m,
  );
});

test("dependencies resolve the nearest tsconfig including inherited aliases", (context) => {
  const root = fixture(context, {
    ...episode,
    "tsconfig.json": JSON.stringify({
      compilerOptions: { paths: { "@episode/*": ["./episodes/*"] } },
    }),
    "tools/tsconfig.json": JSON.stringify({ extends: "../tsconfig.json" }),
    "tools/sample.ts": 'import "@episode/demo/index.ts";',
  });
  const result = run(root, "dependencies");
  assert.equal(result.status, 1);
  assert.match(result.stderr, /^tools\/sample\.ts:1 dependency-direction .+$/m);
});

test("src forbids literal episode asset paths, including template segments", (context) => {
  const root = fixture(context, {
    "src/sample.tsx": [
      "export {};",
      'const asset = "episodes/demo/image.png";',
      'const publicAsset = "/root/public/episodes/demo/image.png";',
      "const template = `episodes/${name}/image.png`;",
      "const tail = `${name}/public/episodes/image.png`;",
      'const view = <img src="episodes/demo/image.png" />;',
      'const relative = "../episodes/demo/image.png";',
      'const nested = "other/episodes/demo/image.png";',
      'const url = new URL("../episodes/demo/image.png", import.meta.url);',
      'const resolved = require.resolve("../episodes/demo/index.ts");',
      'const metaResolved = import.meta.resolve("../episodes/demo/index.ts");',
    ].join("\n"),
  });
  const result = run(root, "dependencies");
  assert.equal(result.status, 1);
  assert.equal(result.stderr.trim().split("\n").length, 10);
  for (const line of [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]) {
    assert.match(
      result.stderr,
      new RegExp(`^src/sample\\.tsx:${line} episode-path .+$`, "m"),
    );
  }
});

test("dependencies allow method modules, tool path strings and product-layer imports", (context) => {
  const root = fixture(context, {
    "src/kit/value.ts": "export const value = 1;",
    "src/sample.ts": [
      'import { value } from "./kit/value.ts";',
      'export * from "./kit/value.ts";',
      'const loaded = import("./kit/value.ts");',
      'const required = require("./kit/value.ts");',
      'const ordinary = "my-episodes/demo/file.png";',
      'const nested = "other/my-episodes/demo/file.png";',
      "const loadedAtRuntime = import(moduleName);",
      "const template = import(`../${directory}/index.ts`);",
    ].join("\n"),
    "tools/sample.ts": [
      'import { value } from "../src/kit/value.ts";',
      'const path = "episodes/demo/image.png";',
      'const publicPath = "/public/episodes/demo/image.png";',
      "const template = `episodes/${name}/image.png`;",
      'const resolved = require.resolve("../episodes/demo/index.ts");',
      'const metaResolved = import.meta.resolve("../episodes/demo/index.ts");',
      'const mixedCase = import("../Episodes/demo/index.ts");',
    ].join("\n"),
    "episodes/demo/index.ts":
      'import "../../src/kit/value.ts"; import "../other/index.ts";',
    "root.ts": 'import "./episodes/demo/index.ts";',
  });
  const result = run(root, "dependencies");
  assert.equal(result.status, 0, result.stderr);
});

test("dependencies deduplicate modules while retaining separate asset diagnostics on the same line", (context) => {
  const root = fixture(context, {
    ...episode,
    "src/sample.ts": [
      'import "episodes/demo/index.ts"; const asset = "episodes/demo/image.png";',
      "const loaded = import(`../episodes/${ep}/index.ts`);",
    ].join("\n"),
  });
  const result = run(root, "dependencies");
  assert.equal(result.status, 1);
  const lines = result.stderr.trim().split("\n");
  assert.equal(lines.length, 3);
  assert.match(lines[0], /^src\/sample\.ts:1 dependency-direction .+$/);
  assert.match(lines[1], /^src\/sample\.ts:1 episode-path .+$/);
  assert.match(lines[2], /^src\/sample\.ts:2 dependency-direction .+$/);
});

test("guardrails check tracked ignored paths and skip ignored untracked files", (context) => {
  const root = fixture(context, {
    ".gitignore": "build\nout\n",
    "src/kit/build/tracked.ts":
      'export {};\n// explanation\nimport "../../../episodes/demo/index.ts";',
    "out/ignored.ts": "export {}; // explanation",
    "src/kit/build/ignored.ts": "export {}; // explanation",
    ...episode,
  });
  execFileSync("git", ["add", "--force", "--", "src/kit/build/tracked.ts"], {
    cwd: root,
  });
  const comments = run(root, "comments");
  assert.equal(comments.status, 1);
  assert.match(
    comments.stderr,
    /^src\/kit\/build\/tracked\.ts:2 comment-position .+\n$/,
  );
  const dependencies = run(root, "dependencies");
  assert.equal(dependencies.status, 1);
  assert.match(
    dependencies.stderr,
    /^src\/kit\/build\/tracked\.ts:3 dependency-direction .+\n$/,
  );
});

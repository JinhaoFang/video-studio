/**
 * Run repository verification with `pnpm verify`: ESLint, browser and Node
 * TypeScript checks, comment/dependency/document command guardrails, then tests.
 * Tests live in the Node type-checking environment, including browser folders.
 * Structured failure events also reject suite errors that Node can omit from
 * its failure counters; skipped and TODO tests keep their normal semantics.
 * An empty test set succeeds without starting Node's broader test discovery.
 * `pnpm verify --static` runs every step except tests. --help exits 0; invalid
 * arguments exit 2 with a Chinese diagnostic.
 */
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { pipeline } from "node:stream/promises";
import { run as runTests } from "node:test";
import { tap } from "node:test/reporters";
import { parseArgs } from "node:util";
import { listCodeFiles } from "./code-files.ts";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(import.meta.url);
const usage = "用法：pnpm verify [--static] [--help]";
let values;
try {
  ({ values } = parseArgs({
    options: { static: { type: "boolean" }, help: { type: "boolean" } },
  }));
} catch {
  console.error(`出错：参数错误。${usage}`);
  process.exit(2);
}
if (values.help) {
  console.log(
    `${usage}\n默认运行全部静态检查和测试；--static 只运行 ESLint、类型检查和护栏，不运行测试。`,
  );
  process.exit(0);
}

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
  run(`eslint (${files.length} files)`, [
    eslint,
    "--no-ignore",
    "--",
    ...files,
  ]);
}
run("tsc (browser)", [tsc, "--project", "tsconfig.json"]);
run("tsc (Node)", [tsc, "--project", "tools/tsconfig.json"]);
run("comment position", ["tools/check-guardrails.ts", "comments"]);
run("dependency direction", ["tools/check-guardrails.ts", "dependencies"]);
run("规则文档命令存在性", ["tools/check-doc-commands.ts"]);

const tests = files.filter((path) => path.endsWith(".test.ts"));
if (values.static) {
  console.log("\n[verify] 静态检查通过（未运行测试）");
} else if (tests.length > 0) {
  console.log(`\n[verify] node:test (${tests.length} files)`);
  try {
    const results = runTests({ files: tests.map((path) => join(root, path)) });
    results.on("test:fail", (event) => {
      if (event.skip === undefined && event.todo === undefined)
        process.exitCode = 1;
    });
    results.on("test:summary", (event) => {
      if (!event.success) process.exitCode = 1;
    });
    await pipeline(results.compose(tap), process.stdout);
  } catch (error) {
    console.error(`出错：测试运行出错：${String(error)}`);
    process.exitCode = 2;
  }
} else {
  console.log("\n[verify] node:test (0 files, skipped)");
}

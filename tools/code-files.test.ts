/**
 * Exercise verification's file scope in a temporary Git repository. Forced
 * tracked paths must survive ignore patterns, while ignored untracked files do
 * not enter verification. Run with `node --test tools/code-files.test.ts`.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { test } from "node:test";
import { listCodeFiles } from "./code-files.ts";

test("Git alone controls tracked and non-ignored untracked code paths", (context) => {
  const root = mkdtempSync(join(tmpdir(), "studio-code-files-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  writeFileSync(
    join(root, ".gitignore"),
    "build\nreferences\nnode_modules\nout\ndist\n.codex-runs\n.agents\n.claude/\n",
  );
  const tracked = [
    "src/kit/build/tracked.ts",
    "src/kit/out/tracked.tsx",
    ".claude/other/tracked.js",
    ".agents/tracked.mjs",
    "references/tracked.cjs",
    "node_modules/tracked.ts",
    "dist/tracked.ts",
    ".codex-runs/tracked.ts",
  ];
  const untracked = [
    "src/new.ts",
    "tools/new.js",
    "src/view.tsx",
    "config.mjs",
    "tools/common.cjs",
  ];
  const ignored = [
    "src/kit/build/ignored.ts",
    "references/ignored.ts",
    "node_modules/ignored.ts",
    "out/ignored.ts",
    "dist/ignored.ts",
    ".codex-runs/ignored.ts",
    ".agents/ignored.ts",
    ".claude/other/ignored.ts",
  ];
  for (const path of [
    ...tracked,
    ...untracked,
    ...ignored,
    "notes.md",
    "src/types.json",
    "deleted.ts",
  ]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), "");
  }
  execFileSync("git", ["add", "--force", "--", ...tracked, "deleted.ts"], {
    cwd: root,
  });
  rmSync(join(root, "deleted.ts"));
  assert.deepEqual(listCodeFiles(root), [...tracked, ...untracked].sort());
});

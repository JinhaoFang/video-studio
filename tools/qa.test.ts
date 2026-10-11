/**
 * Verify the public QA dispatcher help and argument/runtime exit conventions.
 * Media behavior lives in the tests named after each subcommand.
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { join } from "node:path";
import { runCommand, temporaryDirectory } from "./test-support.ts";

const cli = join(import.meta.dirname, "qa.ts");

test("all QA commands print Chinese help with 0, missing parameters with 2", (context) => {
  const root = temporaryDirectory(context);
  for (const name of ["", "frames", "sheet", "compare", "loudness"]) {
    const args = name ? [name] : [];
    const help = runCommand(process.execPath, [cli, ...args, "--help"], {
      cwd: root,
    });
    assert.equal(help.status, 0, help.stderr);
    assert.match(help.stdout, /用法：/);
    assert.match(help.stdout, /[\u4e00-\u9fff]/);
    assert.doesNotMatch(help.stdout, /Usage|Available|Times|must be/);
    const missing = runCommand(process.execPath, [cli, ...args], { cwd: root });
    assert.equal(missing.status, 2);
    assert.match(missing.stderr, /^出错：/);
    assert.match(missing.stderr, /用法：/);
  }
  for (const name of ["unknown", "constructor", "__proto__"]) {
    const result = runCommand(process.execPath, [cli, name], { cwd: root });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^出错：未知子命令/);
  }
  for (const args of [
    ["frames", "missing.mp4", "0"],
    ["sheet", "missing.mp4", "--count", "1"],
    ["compare", "missing.mp4", "missing.mp4", "0"],
    ["loudness", "missing.mp4"],
  ]) {
    const result = runCommand(process.execPath, [cli, ...args], { cwd: root });
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^出错：文件或程序不存在：/);
  }
});

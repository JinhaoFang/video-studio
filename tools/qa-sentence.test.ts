/**
 * Exercise sentence lookup through the public QA dispatcher: machine output,
 * source-specific timelines, frame/second offsets, boundary precision and errors.
 * Fixtures contain only generated JSON; run via pnpm verify or node --test.
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";
import { runCommand, temporaryDirectory } from "./test-support.ts";
import { generateTimeline } from "./timeline.ts";

const cli = join(import.meta.dirname, "qa.ts");
const run = (args: string[]) =>
  runCommand(process.execPath, [cli, "sentence", ...args]);
const makeTimeline = (
  root: string,
  name = "timeline.json",
  duration = 1.22,
) => {
  const path = join(root, name);
  writeFileSync(
    path,
    JSON.stringify(
      generateTimeline(
        [
          { id: "L001", text: "第一句", pauseAfterSeconds: 0.08 },
          { id: "L002", text: "第二句", pauseAfterSeconds: 0.24 },
        ],
        [
          { id: "L001", durationSeconds: duration, src: "L001.wav" },
          { id: "L002", durationSeconds: 1.9, src: "L002.wav" },
        ],
        { kind: "temporary", description: "测试音轨" },
        0.37,
      ),
    ),
  );
  return path;
};

test("sentence emits seconds for compare, frames and JSON; offsets use each input timeline", (context) => {
  const root = temporaryDirectory(context);
  const reference = makeTimeline(root);
  const render = makeTimeline(root, "render.json", 2.22);
  const seconds = run([reference, "L002"]);
  assert.equal(seconds.status, 0, seconds.stderr);
  assert.match(seconds.stdout, /^\d+(?:\.\d+)?\n$/);
  assert.ok(Number(seconds.stdout) >= 50 / 30);
  assert.ok(Number(seconds.stdout) - 50 / 30 < 1e-9);
  for (const [path, expected] of [
    [reference, 50],
    [render, 80],
  ] as const) {
    for (const offset of [
      ["--offset-seconds", "0.5"],
      ["--offset-frames", "15"],
    ]) {
      const result = run([path, "L002", ...offset, "--format", "json"]);
      assert.equal(result.status, 0, result.stderr);
      const point = JSON.parse(result.stdout);
      assert.equal(point.id, "L002");
      assert.equal(point.frame, expected + 15);
      assert.equal(point.fps, 30);
    }
  }
  assert.equal(run([reference, "L001", "--format", "frames"]).stdout, "11\n");
  assert.equal(
    run([reference, "L001", "--offset-seconds", "0.05", "--format", "frames"])
      .stdout,
    "13\n",
  );
});

test("sentence rejects unknown IDs, invalid offsets/options and corrupt timelines with code 2", (context) => {
  const root = temporaryDirectory(context);
  const path = makeTimeline(root);
  const invalid = join(root, "invalid.json");
  writeFileSync(invalid, '{"version": 1, "fps": 0}');
  for (const args of [
    [],
    [path],
    [path, "L999"],
    [path, "L001", "extra"],
    [path, "1"],
    [path, "L001", "--unknown", "0"],
    [path, "L001", "--offset-seconds", "-0.1"],
    [path, "L001", "--offset-seconds", "NaN"],
    [path, "L001", "--offset-frames", "1.5"],
    [path, "L001", "--offset-frames", "37"],
    [path, "L001", "--offset-seconds", "1.22"],
    [path, "L001", "--offset-seconds", "0", "--offset-frames", "0"],
    [path, "L001", "--offset-frames", "0", "--offset-frames", "1"],
    [path, "L001", "--format", "unknown"],
    [invalid, "L001"],
    [join(root, "missing.json"), "L001"],
  ]) {
    const result = run(args);
    assert.equal(result.status, 2, JSON.stringify(args));
    assert.match(result.stderr, /^出错：/);
  }
  assert.match(run([path, "L999"]).stderr, /找不到句子编号：L999/);
  const help = run(["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /用法：/);
});

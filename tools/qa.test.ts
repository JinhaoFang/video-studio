/**
 * Exercise QA through the real Node CLI and generated lavfi videos. Frame
 * identities are grayscale values, so boundary and VFR assertions inspect
 * output pixels rather than implementation details. Cover dimensions, output
 * paths/overwrite, help, invalid inputs, and missing external programs too.
 * Run with `pnpm verify` or `node --test tools/qa.test.ts`; ffmpeg is required.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

const cli = resolve(import.meta.dirname, "qa.ts");

const fixture = (context: TestContext): string => {
  const root = mkdtempSync(join(tmpdir(), "studio-qa-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};

const run = (root: string, args: string[], path = process.env.PATH) =>
  spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    env: { ...process.env, PATH: path },
    timeout: 30000,
  });

const successful = (root: string, args: string[]): string[] => {
  const result = run(root, args);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout.trim().split("\n");
};

const media = (args: string[]): Buffer =>
  execFileSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", ...args],
    {
      timeout: 30000,
      maxBuffer: 32 * 1024 * 1024,
    },
  );

const numberedVideo = (root: string, vfr = false): string => {
  const video = join(root, "numbered video ' $ ;.avi");
  media([
    "-f",
    "lavfi",
    "-i",
    "nullsrc=s=64x48:r=10:d=1,format=gray,geq=lum='20+20*N'",
    ...(vfr
      ? ["-vf", "select='not(eq(n,1)+eq(n,3)+eq(n,6))'", "-vsync", "0"]
      : []),
    "-c:v",
    "ffv1",
    "-threads",
    "1",
    video,
  ]);
  return video;
};

const frameGray = (path: string): number => {
  const bytes = media([
    "-i",
    path,
    "-frames:v",
    "1",
    "-f",
    "rawvideo",
    "-pix_fmt",
    "gray",
    "-threads",
    "1",
    "pipe:1",
  ]);
  return bytes.reduce((sum, value) => sum + value, 0) / bytes.length;
};

const frameIs = (path: string, number: number): void => {
  const actual = frameGray(path);
  assert.ok(
    Math.abs(actual - (20 + number * 20)) <= 2,
    `Expected frame ${number}, got gray ${actual}: ${path}`,
  );
  const bytes = readFileSync(path);
  assert.equal(bytes.readUInt16BE(0), 0xffd8);
  assert.equal(bytes.readUInt16BE(bytes.length - 2), 0xffd9);
};

test("QA help advertises implemented commands and unknown commands fail with help", (context) => {
  const root = fixture(context);
  for (const args of [[], ["--help"], ["frames", "--help"]]) {
    const result = run(root, args);
    assert.equal(result.status, 0);
    assert.match(result.stdout, /pnpm qa frames/);
  }
  for (const name of ["unknown", "constructor", "__proto__"]) {
    const result = run(root, [name]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Unknown command/);
    assert.match(result.stderr, /Available commands/);
    assert.match(result.stderr, /frames/);
  }
});

test("frames extracts the displayed frame at/before exact boundaries and overwrites outputs", (context) => {
  const root = fixture(context);
  const video = numberedVideo(root);
  const args = [
    "frames",
    video,
    "0",
    "0.099999999999999999",
    "0.1",
    "00:00.3",
    "00:00:00.999",
  ];
  const paths = successful(root, args);
  assert.equal(paths.length, 5);
  for (const [index, expected] of [0, 0, 1, 3, 9].entries()) {
    frameIs(paths[index], expected);
    assert.equal(
      dirname(paths[index]),
      join(root, "out", "qa", "frames", "numbered video ' $ ;"),
    );
    assert.match(paths[index], /\d{2}-\d{2}\.\d{3}(?:-\d+)?\.jpg$/);
  }
  assert.equal(new Set(paths).size, 5);
  const before = paths.map((path) => readFileSync(path));
  writeFileSync(paths[2], "replace me");
  assert.deepEqual(successful(root, args), paths);
  paths.forEach((path, index) =>
    assert.deepEqual(readFileSync(path), before[index]),
  );
  assert.equal(readdirSync(dirname(paths[0])).length, 5);
});

test("VFR selection follows presentation timestamps, including gaps and boundaries", (context) => {
  const root = fixture(context);
  const video = numberedVideo(root, true);
  const args = [
    "frames",
    video,
    "0.1",
    "0.199999999999999999",
    "0.2",
    "0.399999999999999999",
    "0.4",
    "0.6",
    "0.7",
    "0.999",
    "--out",
    "custom frames",
  ];
  const paths = successful(root, args);
  assert.equal(paths.length, 8);
  for (const [index, expected] of [0, 0, 2, 2, 4, 5, 7, 9].entries()) {
    frameIs(paths[index], expected);
    assert.equal(dirname(paths[index]), join(root, "custom frames"));
  }
});

test("frames preserves small images and caps landscape/portrait dimensions without stretching", (context) => {
  const root = fixture(context);
  for (const [width, height, expectedWidth, expectedHeight] of [
    [64, 48, 64, 48],
    [2400, 1200, 2000, 1000],
    [1200, 2400, 1000, 2000],
  ]) {
    const video = join(root, `${width}x${height}.avi`);
    media([
      "-f",
      "lavfi",
      "-i",
      `color=gray:s=${width}x${height}:r=1:d=1`,
      "-c:v",
      "ffv1",
      "-threads",
      "1",
      video,
    ]);
    const [output] = successful(root, ["frames", video, "0"]);
    const dimensions = JSON.parse(
      execFileSync(
        "ffprobe",
        [
          "-v",
          "error",
          "-show_entries",
          "stream=width,height",
          "-of",
          "json",
          output,
        ],
        { encoding: "utf8" },
      ),
    ).streams[0];
    assert.equal(dimensions.width, expectedWidth);
    assert.equal(dimensions.height, expectedHeight);
  }
});

test("frames rejects out-of-range times and malformed arguments before creating output", (context) => {
  const root = fixture(context);
  const video = numberedVideo(root);
  for (const args of [
    ["frames"],
    ["frames", video],
    ["frames", video, "-1"],
    ["frames", video, "00:60"],
    ["frames", video, "0", "--out"],
    ["frames", video, "0", "--out", "x", "--out", "y"],
    ["frames", video, "0", "--unknown"],
  ]) {
    const result = run(root, args);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /qa:/);
    assert.match(result.stderr, /Usage:|Invalid time/);
  }
  for (const time of ["1", "1.001", "99"]) {
    const result = run(root, ["frames", video, "0", time]);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /outside video duration/);
  }
  assert.deepEqual(readdirSync(root), ["numbered video ' $ ;.avi"]);
});

test("frames explains installation when ffmpeg or ffprobe is missing", (context) => {
  const root = fixture(context);
  const video = numberedVideo(root);
  const isolated = fixture(context);
  const noFfmpeg = run(root, ["frames", video, "0"], isolated);
  assert.equal(noFfmpeg.status, 1);
  assert.match(noFfmpeg.stderr, /ffmpeg is not installed.*Install ffmpeg/);
  const ffmpeg = execFileSync("which", ["ffmpeg"], { encoding: "utf8" }).trim();
  symlinkSync(ffmpeg, join(isolated, "ffmpeg"));
  const noFfprobe = run(root, ["frames", video, "0"], isolated);
  assert.equal(noFfprobe.status, 1);
  assert.match(noFfprobe.stderr, /ffprobe is not installed.*Install ffmpeg/);
});

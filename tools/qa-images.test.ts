/**
 * Exercise sheet/compare through the public CLI with generated grayscale media.
 * Assert JPG dimensions, page/cell counts, requested frame identities, padding,
 * exact interval/count/offset arithmetic, default/custom paths, and failures.
 * Pixel samples are numeric checks away from labels; visual design is reviewed
 * separately on real reference outputs. Run through pnpm verify; needs ffmpeg.
 */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import type { TestContext } from "node:test";

const cli = resolve(import.meta.dirname, "qa.ts");
const fixture = (context: TestContext): string => {
  const root = mkdtempSync(join(tmpdir(), "studio-qa-images-"));
  context.after(() => rmSync(root, { recursive: true, force: true }));
  return root;
};
const media = (args: string[]): Buffer =>
  execFileSync(
    "ffmpeg",
    ["-hide_banner", "-loglevel", "error", "-nostdin", "-y", ...args],
    { timeout: 30000, maxBuffer: 32 * 1024 * 1024 },
  );

const video = (root: string, width = 160, height = 90, vfr = false): string => {
  const path = join(root, `${width}x${height} ' $ ; ${vfr}.mkv`);
  media([
    "-f",
    "lavfi",
    "-i",
    `nullsrc=s=${width}x${height}:r=10:d=3.2,format=gray,geq=lum='20+7*N'`,
    ...(vfr
      ? ["-vf", "select='not(eq(n,1)+eq(n,3)+eq(n,6))'", "-vsync", "0"]
      : []),
    "-c:v",
    "ffv1",
    "-threads",
    "1",
    path,
  ]);
  return path;
};
const run = (root: string, args: string[]) =>
  spawnSync(process.execPath, [cli, ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: 30000,
  });
const successful = (root: string, args: string[]): string[] => {
  const result = run(root, args);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const paths = result.stdout.trim().split("\n");
  for (const path of paths) {
    const bytes = readFileSync(path);
    assert.equal(bytes.readUInt16BE(0), 0xffd8);
    assert.equal(bytes.readUInt16BE(bytes.length - 2), 0xffd9);
  }
  return paths;
};
const image = (path: string) => {
  const { width, height } = JSON.parse(
    execFileSync(
      "ffprobe",
      [
        "-v",
        "error",
        "-show_entries",
        "stream=width,height",
        "-of",
        "json",
        path,
      ],
      { encoding: "utf8" },
    ),
  ).streams[0] as { width: number; height: number };
  const pixels = media([
    "-i",
    path,
    "-frames:v",
    "1",
    "-pix_fmt",
    "gray",
    "-threads",
    "1",
    "-f",
    "rawvideo",
    "pipe:1",
  ]);
  return { width, height, at: (x: number, y: number) => pixels[y * width + x] };
};
const frameIs = (value: number, frame: number): void => {
  assert.ok(
    Math.abs(value - (20 + frame * 7)) <= 2,
    `Expected frame ${frame}, got gray ${value}`,
  );
};

test("sheet every selects exact inclusive times, paginates at 24, leaves empty cells, and overwrites", (context) => {
  const root = fixture(context);
  const input = video(root);
  const args = ["sheet", input, "--from", "0", "--to", "2.4", "--every", "0.1"];
  const paths = successful(root, args);
  assert.equal(paths.length, 2);
  assert.match(paths[0], /page-001\.jpg$/);
  assert.match(paths[1], /page-002\.jpg$/);
  assert.equal(
    dirname(paths[0]),
    join(root, "out", "qa", "sheet", "160x90 ' $ ; false"),
  );
  const first = image(paths[0]);
  assert.deepEqual([first.width, first.height], [1920, 1620]);
  for (let index = 0; index < 24; index += 1) {
    frameIs(
      first.at((index % 4) * 480 + 240, Math.floor(index / 4) * 270 + 100),
      index,
    );
  }
  const second = image(paths[1]);
  assert.deepEqual([second.width, second.height], [1920, 270]);
  frameIs(second.at(240, 100), 24);
  assert.ok(
    second.at(720, 100) <= 2,
    `Empty cell gray: ${second.at(720, 100)}`,
  );
  const before = paths.map((path) => readFileSync(path));
  writeFileSync(paths[0], "replace me");
  assert.deepEqual(successful(root, args), paths);
  paths.forEach((path, index) =>
    assert.deepEqual(readFileSync(path), before[index]),
  );
  assert.equal(readdirSync(dirname(paths[0])).length, 2);
});

test("sheet count includes endpoints, one means from, and duration endpoint uses the final frame", (context) => {
  const root = fixture(context);
  const input = video(root);
  const [path] = successful(root, [
    "sheet",
    input,
    "--from",
    "00:00.1",
    "--to",
    "00:00:00.5",
    "--count",
    "3",
    "--cols",
    "3",
    "--out",
    "custom sheet",
  ]);
  assert.equal(dirname(path), join(root, "custom sheet"));
  const output = image(path);
  assert.deepEqual([output.width, output.height], [1440, 270]);
  [1, 3, 5].forEach((frame, index) =>
    frameIs(output.at(index * 480 + 240, 100), frame),
  );
  const [single] = successful(root, [
    "sheet",
    input,
    "--from",
    "0.2",
    "--count",
    "1",
    "--cols",
    "1",
  ]);
  assert.deepEqual([image(single).width, image(single).height], [480, 270]);
  frameIs(image(single).at(240, 100), 2);
  const [endpoints] = successful(root, ["sheet", input, "--count", "2"]);
  const endpointImage = image(endpoints);
  frameIs(endpointImage.at(240, 100), 0);
  frameIs(endpointImage.at(720, 100), 31);
  const [everyEnd] = successful(root, ["sheet", input, "--every", "3.2"]);
  frameIs(image(everyEnd).at(720, 100), 31);
});

test("sheet preserves decimal step and VFR frame selection, and caps portrait pages", (context) => {
  const root = fixture(context);
  const input = video(root, 160, 90, true);
  const [path] = successful(root, [
    "sheet",
    input,
    "--from",
    "0.099999999999999999",
    "--to",
    "0.399999999999999999",
    "--every",
    "0.1",
  ]);
  const output = image(path);
  [0, 0, 2, 2].forEach((frame, index) =>
    frameIs(output.at(index * 480 + 240, 100), frame),
  );
  const portrait = video(root, 90, 160);
  const [tall] = successful(root, ["sheet", portrait, "--count", "24"]);
  const dimensions = image(tall);
  assert.equal(dimensions.height, 2000);
  assert.ok(
    Math.abs(dimensions.width / dimensions.height - 1920 / (853 * 6)) < 0.001,
  );
});

test("compare pads 4:3 reference equally beside 16:9 render and applies signed exact offsets", (context) => {
  const root = fixture(context);
  const render = video(root);
  const reference = video(root, 120, 90);
  const paths = successful(root, [
    "compare",
    render,
    reference,
    "00:00.5",
    "00:01.1",
    "--offset",
    "0.2",
  ]);
  assert.equal(paths.length, 2);
  assert.equal(
    dirname(paths[0]),
    join(root, "out", "qa", "compare", "160x90 ' $ ; false"),
  );
  for (const [index, path] of paths.entries()) {
    const output = image(path);
    assert.deepEqual([output.width, output.height], [1920, 540]);
    frameIs(output.at(480, 100), [5, 11][index]);
    frameIs(output.at(1440, 100), [7, 13][index]);
    for (const x of [980, 1060, 1820, 1900])
      assert.ok(output.at(x, 100) <= 2, `Padding gray: ${output.at(x, 100)}`);
    frameIs(output.at(1090, 100), [7, 13][index]);
    frameIs(output.at(1790, 100), [7, 13][index]);
  }
  const [negative] = successful(root, [
    "compare",
    render,
    reference,
    "0.5",
    "--offset",
    "-0.2",
    "--out",
    "negative offset",
  ]);
  assert.equal(dirname(negative), join(root, "negative offset"));
  frameIs(image(negative).at(1440, 100), 3);
  const [boundary] = successful(root, [
    "compare",
    render,
    reference,
    "0.099999999999999999",
    "--offset",
    "0.000000000000000001",
  ]);
  frameIs(image(boundary).at(480, 100), 0);
  frameIs(image(boundary).at(1440, 100), 1);
});

test("compare handles same-file requests in arbitrary order, repeated timestamps, and height cap", (context) => {
  const root = fixture(context);
  const input = video(root, 160, 90, true);
  const paths = successful(root, [
    "compare",
    input,
    input,
    "0.7",
    "0.1",
    "0.7",
    "--offset",
    "0",
  ]);
  assert.equal(new Set(paths).size, 3);
  paths.forEach((path, index) => {
    const output = image(path);
    const expected = [7, 0, 7][index];
    frameIs(output.at(480, 100), expected);
    frameIs(output.at(1440, 100), expected);
  });
  const [capped] = successful(root, [
    "compare",
    input,
    input,
    "0",
    "--height",
    "1080",
  ]);
  const output = image(capped);
  assert.deepEqual([output.width, output.height], [2000, 563]);
});

test("sheet/compare help and invalid argument/range failures create no outputs", (context) => {
  const root = fixture(context);
  const input = video(root);
  const shorter = join(root, "short.mkv");
  media([
    "-f",
    "lavfi",
    "-i",
    "color=white:s=120x90:r=10:d=1",
    "-c:v",
    "ffv1",
    "-threads",
    "1",
    shorter,
  ]);
  for (const command of ["sheet", "compare"]) {
    const result = run(root, [command, "--help"]);
    assert.equal(result.status, 0);
    assert.match(result.stdout, new RegExp(`pnpm qa ${command}`));
  }
  for (const args of [
    ["sheet", input],
    ["sheet", input, "--every", "1", "--count", "2"],
    ["sheet", input, "--every", "0"],
    ["sheet", input, "--every", "-1"],
    ["sheet", input, "--every", "00:01"],
    ["sheet", input, "--count", "0"],
    ["sheet", input, "--count", "1.5"],
    ["sheet", input, "--count", "1", "--cols", "0"],
    ["sheet", input, "--count", "1", "--from", "1", "--to", "0"],
    ["sheet", input, "--count", "1", "--to", "3.3"],
    ["sheet", input, "--every", "1", "--out"],
    ["sheet", input, "--every", "1", "--every", "2"],
    ["sheet", input, "--every", "1", "--unknown", "2"],
    ["compare", input, input],
    ["compare", input, input, "0", "--height", "0"],
    ["compare", input, input, "0", "--offset", "NaN"],
    ["compare", input, input, "0", "--offset", "-0.1"],
    ["compare", input, input, "3.2"],
    ["compare", input, shorter, "1"],
    ["compare", shorter, input, "1"],
    ["compare", input, shorter, "0.5", "--offset", "0.5"],
    ["compare", input, input, "0", "--out", "x", "--out", "y"],
  ]) {
    const result = run(root, args);
    assert.equal(
      result.status,
      1,
      `${args.join(" ")}\n${result.stdout}${result.stderr}`,
    );
    assert.match(result.stderr, /qa:/);
  }
  assert.equal(readdirSync(root).length, 2);
});

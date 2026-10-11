/**
 * Exercise subcommands through the public CLI with generated grayscale media.
 * Assert JPG dimensions, page/cell counts, requested frame identities, padding,
 * exact interval/count/offset arithmetic, default/custom paths, and failures.
 * Pixel samples are numeric checks away from labels; visual design is reviewed
 * separately on real reference outputs. Run through pnpm verify; needs ffmpeg.
 */
import assert from "node:assert/strict";
import {
  runCommand as spawnSync,
  temporaryDirectory as fixture,
  numberedVideo,
  image,
  frameIs,
} from "./test-support.ts";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";

const cli = resolve(import.meta.dirname, "qa.ts");
const video = (root: string, width = 160, height = 90, vfr = false): string =>
  numberedVideo(root, { width, height, vfr });
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

test("compare applies offsets on each file timeline with delayed video streams", (context) => {
  const root = fixture(context);
  const render = numberedVideo(root, {
    offset: 0.5,
    audio: true,
    name: "delayed.mkv",
  });
  const reference = video(root);
  const [path] = successful(root, [
    "compare",
    render,
    reference,
    "1.0",
    "--offset",
    "-0.1",
  ]);
  const output = image(path);
  frameIs(output.at(480, 100), 5);
  frameIs(output.at(1440, 100), 9);
});

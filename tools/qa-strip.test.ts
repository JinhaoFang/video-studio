/**
 * 用生成的编号视频通过公开 CLI 验证连续帧条。
 * 检查所选帧内容、整数步长与端点、分页清理、尺寸，以及帧号与时间码标签的实际像素。
 * 可变帧率和延迟视频用于确认时间码来自呈现时间戳，而非名义帧率。
 * 运行 node --test tools/qa-strip.test.ts，需要 ffmpeg 和 ffprobe。
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import {
  frameIs,
  image,
  media,
  numberedVideo,
  runCommand,
  temporaryDirectory,
} from "./test-support.ts";

const cli = resolve(import.meta.dirname, "qa.ts");
const run = (root: string, args: string[]) =>
  runCommand(process.execPath, [cli, "strip", ...args], { cwd: root });
const successful = (root: string, args: string[]): string[] => {
  const result = run(root, args);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const paths = result.stdout.trim().split("\n");
  paths.forEach((path) =>
    assert.equal(readFileSync(path).readUInt16BE(0), 0xffd8),
  );
  return paths;
};
const labelsAre = (path: string, labels: string[]): void => {
  const output = image(path);
  labels.forEach((label, cell) => {
    const expected = media([
      "-f",
      "lavfi",
      "-i",
      "color=black:s=480x270:r=1:d=1",
      "-vf",
      `drawtext=text='${label.replaceAll(":", "\\:")}':fontcolor=white:fontsize=24:box=1:boxcolor=black:boxborderw=6:x=6:y=h-th-6`,
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
    let differing = 0;
    let white = 0;
    for (let y = 210; y < 270; y += 1) {
      for (let x = 0; x < 480; x += 1) {
        const reference = expected[y * 480 + x] > 200;
        const actual = output.at(cell * 480 + x, y) > 200;
        if (reference) white += 1;
        if (reference !== actual) differing += 1;
      }
    }
    assert.ok(white > 500, `标签没有字形：${label}`);
    assert.ok(differing < 30, `标签 ${label} 有 ${differing} 个像素不符`);
  });
};

test("strip selects every decoded frame, paginates at 24 and removes obsolete pages on reruns", (context) => {
  const root = temporaryDirectory(context);
  const input = numberedVideo(root);
  const args = [input, "--from", "0", "--to", "24"];
  const paths = successful(root, args);
  assert.equal(paths.length, 2);
  assert.equal(
    dirname(paths[0]),
    join(root, "out", "qa", "strip", "160x90 ' $ ; false"),
  );
  assert.match(paths[0], /page-001\.jpg$/);
  assert.match(paths[1], /page-002\.jpg$/);
  const first = image(paths[0]);
  assert.deepEqual([first.width, first.height], [1920, 1620]);
  for (let frame = 0; frame < 24; frame += 1) {
    frameIs(
      first.at((frame % 4) * 480 + 240, Math.floor(frame / 4) * 270 + 100),
      frame,
    );
  }
  const last = image(paths[1]);
  assert.deepEqual([last.width, last.height], [1920, 270]);
  frameIs(last.at(240, 100), 24);
  assert.ok(last.at(720, 100) <= 2);
  const before = paths.map((path) => readFileSync(path));
  writeFileSync(paths[0], "replace me");
  assert.deepEqual(successful(root, args), paths);
  paths.forEach((path, index) =>
    assert.deepEqual(readFileSync(path), before[index]),
  );
  const directory = dirname(paths[0]);
  writeFileSync(join(directory, "keep.jpg"), "unrelated");
  const [single] = successful(root, [input, "--from", "31", "--to", "31"]);
  frameIs(image(single).at(240, 100), 31);
  assert.deepEqual(readdirSync(directory), ["keep.jpg", "page-001.jpg"]);
});

test("strip integer steps include the aligned end and label the selected frame numbers and times", (context) => {
  const root = temporaryDirectory(context);
  const input = numberedVideo(root);
  const [path] = successful(root, [
    input,
    "--from=1",
    "--to",
    "5",
    "--every",
    "2",
    "--cols",
    "3",
    "--out",
    "custom strip",
  ]);
  assert.equal(dirname(path), join(root, "custom strip"));
  const output = image(path);
  assert.deepEqual([output.width, output.height], [1440, 270]);
  [1, 3, 5].forEach((frame, index) =>
    frameIs(output.at(index * 480 + 240, 100), frame),
  );
  labelsAre(path, ["F1 00:00.100", "F3 00:00.300", "F5 00:00.500"]);
  const [unaligned] = successful(root, [
    input,
    "--from",
    "1",
    "--to",
    "6",
    "--every",
    "2",
  ]);
  const unalignedImage = image(unaligned);
  frameIs(unalignedImage.at(1200, 100), 5);
  assert.ok(unalignedImage.at(1680, 100) <= 2);
});

test("strip indexes VFR frames directly and labels actual timestamps including delayed video", (context) => {
  const root = temporaryDirectory(context);
  const input = numberedVideo(root, { vfr: true });
  const [path] = successful(root, [input, "--from", "0", "--to", "3"]);
  const output = image(path);
  [0, 2, 4, 5].forEach((frame, index) =>
    frameIs(output.at(index * 480 + 240, 100), frame),
  );
  labelsAre(path, [
    "F0 00:00.000",
    "F1 00:00.200",
    "F2 00:00.400",
    "F3 00:00.500",
  ]);
  const delayed = numberedVideo(root, {
    duration: 1,
    offset: 0.5,
    audio: true,
    name: "delayed.mkv",
  });
  const [delayedPath] = successful(root, [
    delayed,
    "--from",
    "0",
    "--to",
    "2",
    "--every",
    "2",
  ]);
  labelsAre(delayedPath, ["F0 00:00.500", "F2 00:00.700"]);
});

test("strip retains sheet's portrait aspect ratio and 2000px page cap", (context) => {
  const root = temporaryDirectory(context);
  const input = numberedVideo(root, { width: 90, height: 160 });
  const [path] = successful(root, [input, "--from", "0", "--to", "23"]);
  const output = image(path);
  assert.equal(output.height, 2000);
  assert.ok(Math.abs(output.width / output.height - 1920 / (853 * 6)) < 0.001);
});

test("strip provides Chinese help and rejects invalid frame ranges/options before creating output", (context) => {
  const root = temporaryDirectory(context);
  const input = numberedVideo(root);
  const help = run(root, ["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /用法：pnpm qa strip/);
  assert.match(help.stdout, /帧号从 0 开始/);
  for (const args of [
    [],
    [input],
    [input, "--from", "0"],
    [input, "--to", "1"],
    [input, "extra", "--from", "0", "--to", "1"],
    ...[
      ["--from", "-1", "--to", "2"],
      ["--from", "0.5", "--to", "2"],
      ["--from", "00:00", "--to", "2"],
      ["--from", "2", "--to", "1"],
      ["--from", "0", "--to", "32"],
      ["--from", "0", "--to", "9007199254740992"],
      ["--from", "0", "--to", "1", "--every", "0"],
      ["--from", "0", "--to", "1", "--every", "1.5"],
      ["--from", "0", "--to", "1", "--cols", "0"],
      ["--from", "0", "--to", "1", "--out"],
      ["--from", "0", "--to", "1", "--from", "0"],
      ["--from", "0", "--to", "1", "--unknown", "1"],
    ].map((args) => [input, ...args]),
  ]) {
    const result = run(root, args);
    assert.equal(result.status, 2, args.join(" ") + result.stderr);
    assert.match(result.stderr, /^出错：/);
  }
  assert.deepEqual(readdirSync(root), ["160x90 ' $ ; false.mkv"]);
});

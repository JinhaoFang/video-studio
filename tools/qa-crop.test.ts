/**
 * 用生成的无损视频通过公开 CLI 验证像素裁切。
 * 灰度随坐标和帧号变化，逐像素检查位置、原始尺寸、奇数坐标、多区域与像素宽高比边界。
 * 同时检查固定路径覆盖、中文帮助，以及参数错误时不创建输出。
 * 运行 node --test tools/qa-crop.test.ts，需要 ffmpeg 和 ffprobe。
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { test } from "node:test";
import {
  image,
  media,
  runCommand,
  temporaryDirectory,
} from "./test-support.ts";

const cli = resolve(import.meta.dirname, "qa.ts");
const run = (root: string, args: string[]) =>
  runCommand(process.execPath, [cli, "crop", ...args], { cwd: root });
const successful = (root: string, args: string[]): string[] => {
  const result = run(root, args);
  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout.trim().split("\n");
};
const video = (root: string, width = 800, height = 600, sar = 1): string => {
  const input = join(root, `${width}x${height} ' $ ;.mkv`);
  media([
    "-f",
    "lavfi",
    "-i",
    `nullsrc=s=${width}x${height}:r=10:d=1,format=gray,geq=lum='mod(X+3*Y+20*N,256)',setsar=${sar}`,
    "-c:v",
    "ffv1",
    "-threads",
    "1",
    input,
  ]);
  return input;
};
const cropIs = (
  path: string,
  x: number,
  y: number,
  width: number,
  height: number,
  frame: number,
): void => {
  assert.deepEqual(
    readFileSync(path).subarray(0, 8),
    Buffer.from("89504e470d0a1a0a", "hex"),
  );
  const output = image(path);
  assert.deepEqual([output.width, output.height], [width, height]);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      assert.equal(
        output.at(column, row),
        (column + x + 3 * (row + y) + 20 * frame) % 256,
        `像素 ${column},${row}`,
      );
    }
  }
};

test("crop defaults to unscaled 600x450 PNGs, selects exact times and overwrites deterministic paths", (context) => {
  const root = temporaryDirectory(context);
  const input = video(root);
  const args = [input, "0.199999999999999999", "0,0", "200,150", "0,0"];
  const paths = successful(root, args);
  assert.equal(paths.length, 3);
  assert.equal(new Set(paths).size, 3);
  assert.equal(
    dirname(paths[0]),
    join(root, "out", "qa", "crop", "800x600 ' $ ;"),
  );
  paths.forEach((path, index) =>
    cropIs(path, index === 1 ? 200 : 0, index === 1 ? 150 : 0, 600, 450, 1),
  );
  const before = paths.map((path) => readFileSync(path));
  writeFileSync(paths[0], "replace me");
  assert.deepEqual(successful(root, args), paths);
  paths.forEach((path, index) =>
    assert.deepEqual(readFileSync(path), before[index]),
  );
  assert.equal(readdirSync(dirname(paths[0])).length, 3);
  const [boundary] = successful(root, [input, "00:00:00.2", "0,0"]);
  cropIs(boundary, 0, 0, 600, 450, 2);
});

test("crop preserves odd source coordinates/sizes and ignores anamorphic stretching", (context) => {
  const root = temporaryDirectory(context);
  const input = video(root, 800, 600, 2);
  const paths = successful(root, [
    input,
    "0.3",
    "5,7",
    "737,553",
    "--width=63",
    "--height",
    "47",
    "--out",
    "custom crops",
  ]);
  assert.equal(paths.length, 2);
  assert.equal(dirname(paths[0]), join(root, "custom crops"));
  cropIs(paths[0], 5, 7, 63, 47, 3);
  cropIs(paths[1], 737, 553, 63, 47, 3);
  const invalid = run(root, [input, "0", "800,0"]);
  assert.equal(invalid.status, 2);
  assert.match(invalid.stderr, /超出原始画面 800×600/);
});

test("crop does not apply the existing 2000px image cap", (context) => {
  const root = temporaryDirectory(context);
  const input = video(root, 2401, 501);
  const [path] = successful(root, [
    input,
    "0",
    "1,1",
    "--width",
    "2101",
    "--height",
    "451",
  ]);
  cropIs(path, 1, 1, 2101, 451, 0);
});

test("crop provides Chinese help and rejects invalid regions/options/times before creating output", (context) => {
  const root = temporaryDirectory(context);
  const input = video(root);
  const help = run(root, ["--help"]);
  assert.equal(help.status, 0);
  assert.match(help.stdout, /用法：pnpm qa crop/);
  assert.match(help.stdout, /600.*450/);
  for (const args of [
    [],
    [input],
    [input, "0"],
    [input, "0", "-1,0"],
    [input, "0", "1.5,0"],
    [input, "0", "1"],
    [input, "0", "1,2,3"],
    [input, "0", "9007199254740992,0"],
    [input, "0", "201,0"],
    [input, "0", "0,151"],
    [input, "1", "0,0"],
    [input, "-1", "0,0"],
    [input, "0", "0,0", "--width", "0"],
    [input, "0", "0,0", "--height", "-1"],
    [input, "0", "0,0", "--width", "1.5"],
    [input, "0", "0,0", "--out"],
    [input, "0", "0,0", "--out", "a", "--out", "b"],
    [input, "0", "0,0", "--unknown", "1"],
  ]) {
    const result = run(root, args);
    assert.equal(result.status, 2, args.join(" ") + result.stderr);
    assert.match(result.stderr, /^出错：/);
  }
  assert.deepEqual(readdirSync(root), ["800x600 ' $ ;.mkv"]);
});

/**
 * 按从 0 开始的解码帧号生成连续帧条：pnpm qa strip，范围包含起止帧。
 * 标签使用实际呈现时间戳，支持可变帧率与延迟开始的视频，不按假定帧率换算。
 * 复用 sheet 的 480 像素单元格、每页 24 格、整页 2000 像素上限与标签样式。
 * 打印 JPG 绝对路径；重复运行时只清理旧分页图，保留其他文件。
 */
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { usageError } from "./cli.ts";
import { outputDirectory, parseOptions, positiveInteger } from "./qa-common.ts";
import { composeImage } from "./qa-images.ts";
import { formatTimecode } from "./qa-time.ts";
import { extractFrameIndices, probeVideo } from "./qa-video.ts";

export const stripUsage =
  "pnpm qa strip <视频> --from <起始帧> --to <结束帧> [--every <帧步长>] [--cols <列数>] [--out <目录>]";

const frameNumber = (value: string, option: string): number => {
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number)) {
    throw new Error(`${option} 必须是从 0 开始的非负整数帧号。`);
  }
  return number;
};

export const runStrip = (args: string[]): void => {
  const { positional, options, help } = parseOptions(
    args,
    ["--from", "--to", "--every", "--cols", "--out"],
    stripUsage,
  );
  if (help) {
    console.log(
      `用法：${stripUsage}\n帧号从 0 开始，按视频解码后的呈现顺序编号；起止帧均包含在范围内。\n--every 是正整数帧步长，默认 1；仅取起始帧加步长的整数倍。\n默认 4 列，每页最多 24 格；每格标 F帧号 和实际呈现时间码（分:秒.毫秒）。\n时间码零点为文件时间轴起点，可正确显示可变帧率和延迟开始的视频。`,
    );
    return;
  }
  if (
    positional.length !== 1 ||
    !options.has("--from") ||
    !options.has("--to")
  ) {
    throw usageError("请提供一个视频，以及 --from 和 --to 帧号。", stripUsage);
  }
  const from = frameNumber(options.get("--from")!, "--from");
  const to = frameNumber(options.get("--to")!, "--to");
  const step = positiveInteger(options.get("--every") ?? "1", "--every");
  const columns = positiveInteger(options.get("--cols") ?? "4", "--cols");
  if (from > to) throw new Error("--from 不能超过 --to。");
  const input = resolve(positional[0]);
  const video = probeVideo(input);
  if (to >= video.times.length) {
    throw new Error(
      `帧号超出视频范围（0～${video.times.length - 1}，含结尾）。`,
    );
  }
  const indices: number[] = [];
  for (let frame = from; frame <= to; frame += step) indices.push(frame);
  const directory = outputDirectory("strip", input, options.get("--out"));
  mkdirSync(directory, { recursive: true });
  const temporary = mkdtempSync(join(tmpdir(), "qa-strip-"));
  const paths: string[] = [];
  try {
    const height = Math.max(1, Math.round((480 * video.height) / video.width));
    const frames = extractFrameIndices(
      input,
      indices,
      temporary,
      `scale=480:${height}`,
    );
    for (const name of readdirSync(directory)) {
      if (/^page-.*\.jpg$/.test(name)) rmSync(join(directory, name));
    }
    for (let start = 0; start < frames.length; start += 24) {
      const output = join(
        directory,
        `page-${String(start / 24 + 1).padStart(3, "0")}.jpg`,
      );
      const cells = frames.slice(start, start + 24).map((path, index) => {
        const frame = indices[start + index];
        return {
          path,
          label: `F${frame} ${formatTimecode(video.times[frame])}`,
        };
      });
      composeImage(cells, columns, 480, height, output);
      paths.push(output);
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  paths.forEach((path) => console.log(path));
};

/**
 * 按指定时间裁切一个或多个原始像素区域：pnpm qa crop。
 * 坐标原点为编码画面的左上角，不按像素宽高比拉伸，默认尺寸 600×450。
 * 先解码选中的一帧，再在 RGB 图上裁切，保留奇数坐标和尺寸。
 * 输出不缩放的无损 PNG；文件名固定，创建输出目录前先检查时间与区域。
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { usageError } from "./cli.ts";
import {
  outputDirectory,
  outputNamer,
  parseOptions,
  positiveInteger,
  runMedia,
} from "./qa-common.ts";
import { formatTimecode, parseTimecode } from "./qa-time.ts";
import { extractFrames, probeVideo, validateTimes } from "./qa-video.ts";

export const cropUsage =
  "pnpm qa crop <视频> <时间点> <x,y…> [--width <像素>] [--height <像素>] [--out <目录>]";

export const runCrop = (args: string[]): void => {
  const { positional, options, help } = parseOptions(
    args,
    ["--width", "--height", "--out"],
    cropUsage,
  );
  if (help) {
    console.log(
      `用法：${cropUsage}\n时间：12.5、01:12.5、00:01:12.500，零点为文件时间轴起点。\n每个 x,y 为区域左上角的原始像素坐标，从 0,0 开始；可提供多个区域。\n默认宽 600、高 450，所有区域共用尺寸；不缩放、不补边，超出画面时报错。\n输出无标签的 PNG，保留原始像素尺寸，不按像素宽高比拉伸。`,
    );
    return;
  }
  if (positional.length < 3) {
    throw usageError("请提供视频、一个时间点和至少一个 x,y 区域。", cropUsage);
  }
  const [input, time, ...coordinates] = positional;
  const requested = parseTimecode(time);
  const width = positiveInteger(options.get("--width") ?? "600", "--width");
  const height = positiveInteger(options.get("--height") ?? "450", "--height");
  const regions = coordinates.map((value) => {
    const [x, y] = value.split(",").map(Number);
    if (
      !/^\d+,\d+$/.test(value) ||
      !Number.isSafeInteger(x) ||
      !Number.isSafeInteger(y)
    ) {
      throw new Error(`区域无效「${value}」：请用非负整数坐标 x,y。`);
    }
    return { x, y };
  });
  const video = resolve(input);
  const probe = probeVideo(video);
  validateTimes(probe, [requested]);
  for (const { x, y } of regions) {
    if (x > probe.pixelWidth - width || y > probe.height - height) {
      throw new Error(
        `裁切区域 ${x},${y}（${width}×${height}）超出原始画面 ${probe.pixelWidth}×${probe.height}。`,
      );
    }
  }
  const directory = outputDirectory("crop", video, options.get("--out"));
  mkdirSync(directory, { recursive: true });
  const nameOutput = outputNamer(directory);
  const paths = regions.map(({ x, y }) =>
    nameOutput(
      `${formatTimecode(requested).replace(":", "-")}-x${x}-y${y}-${width}x${height}`,
      "png",
    ),
  );
  const temporary = mkdtempSync(join(tmpdir(), "qa-crop-"));
  try {
    const [frame] = extractFrames(
      video,
      probe,
      [requested],
      temporary,
      "format=rgb24",
    );
    regions.forEach(({ x, y }, index) => {
      runMedia("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",
        "-nostdin",
        "-y",
        "-threads",
        "1",
        "-i",
        frame,
        "-vf",
        `crop=${width}:${height}:${x}:${y}:exact=1,setsar=1`,
        "-frames:v",
        "1",
        "-threads",
        "1",
        "-f",
        "image2",
        "-update",
        "1",
        paths[index],
      ]);
    });
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  paths.forEach((path) => console.log(path));
};

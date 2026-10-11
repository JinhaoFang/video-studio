/**
 * Implement `pnpm qa frames <video> <times...> [--out <directory>]`.
 * Probe all decoded presentation timestamps, select the last frame at/before
 * each exact time, then extract all distinct selected indices in one ffmpeg pass.
 * Times use the file/player timeline origin, including delayed video and VFR gaps.
 * Outputs are unlabelled JPEGs capped at 2000px; rounded filename collisions
 * receive numeric suffixes. Full timestamp probing favors accuracy over speed.
 */
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { formatTimecode, parseTimecode } from "./qa-time.ts";
import {
  parseOptions,
  outputDirectory,
  outputNamer,
  imageScale,
} from "./qa-common.ts";
import { usageError } from "./cli.ts";
import { extractFrames, probeVideo, validateTimes } from "./qa-video.ts";

export const framesUsage = "pnpm qa frames <视频> <时间点…> [--out <目录>]";

export const runFrames = (args: string[]): void => {
  const { positional, options, help } = parseOptions(
    args,
    ["--out"],
    framesUsage,
  );
  if (help) {
    console.log(
      `用法：${framesUsage}\n时间：12.5、01:12.5、00:01:12.500；零点为文件时间轴的起点。`,
    );
    return;
  }
  if (positional.length < 2) {
    throw usageError("请提供视频和至少一个时间点。", framesUsage);
  }
  const [input, ...inputs] = positional;
  const requested = inputs.map(parseTimecode);
  const video = resolve(input);
  const probe = probeVideo(video);
  validateTimes(probe, requested);
  const directory = outputDirectory("frames", video, options.get("--out"));
  mkdirSync(directory, { recursive: true });
  const nameOutput = outputNamer(directory);
  const paths = requested.map((time) =>
    nameOutput(formatTimecode(time).replace(":", "-")),
  );
  const temporary = mkdtempSync(join(tmpdir(), "qa-frames-"));
  try {
    const extracted = extractFrames(
      video,
      probe,
      requested,
      temporary,
      imageScale,
      "jpg",
    );
    paths.forEach((path, index) => copyFileSync(extracted[index], path));
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  for (const path of paths) {
    console.log(path);
  }
};

/**
 * Generate `pnpm qa compare` JPGs with RENDER left and REF right, using exact
 * signed decimal offset arithmetic. Each video is extracted once for all times;
 * identical input paths share a single extraction for the combined requests.
 * Scale to the requested height, center on equal-width black cells, and cap the
 * complete image at 2000px. Annotation design is established in #8 and described in qa-images.ts.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  outputDirectory,
  outputNamer,
  parseOptions,
  positiveInteger,
} from "./qa-common.ts";
import { composeImage } from "./qa-images.ts";
import { usageError } from "./cli.ts";
import {
  addTime,
  decimalTime,
  formatTimecode,
  parseTimecode,
} from "./qa-time.ts";
import { extractFrames, probeVideo, validateTimes } from "./qa-video.ts";

export const compareUsage =
  "pnpm qa compare <渲染视频> <参考视频> <时间点…> [--offset <秒>] [--height <像素>] [--out <目录>]";

export const runCompare = (args: string[]): void => {
  const { positional, options, help } = parseOptions(
    args,
    ["--offset", "--height", "--out"],
    compareUsage,
  );
  if (help) {
    console.log(`用法：${compareUsage}`);
    return;
  }
  if (positional.length < 3) {
    throw usageError("请提供两个视频和至少一个时间点。", compareUsage);
  }
  const offsetValue = options.get("--offset") ?? "0";
  if (!/^-?\d+(?:\.\d+)?$/.test(offsetValue)) {
    throw new Error("--offset 必须是可带负号的十进制秒数。");
  }
  const height = positiveInteger(options.get("--height") ?? "540", "--height");
  const offset = decimalTime(offsetValue);
  const [render, reference] = positional
    .slice(0, 2)
    .map((path) => resolve(path));
  const requested = positional.slice(2).map(parseTimecode);
  const referenceTimes = requested.map((time) => addTime(time, offset));
  const left = probeVideo(render);
  const right = render === reference ? left : probeVideo(reference);
  validateTimes(left, requested);
  validateTimes(right, referenceTimes);
  const leftWidth = Math.max(
    1,
    Math.round((height * left.width) / left.height),
  );
  const rightWidth = Math.max(
    1,
    Math.round((height * right.width) / right.height),
  );
  const width = Math.max(leftWidth, rightWidth);
  const directory = outputDirectory("compare", render, options.get("--out"));
  mkdirSync(directory, { recursive: true });
  const temporary = mkdtempSync(join(tmpdir(), "qa-compare-"));
  const paths: string[] = [];
  try {
    let leftFrames: string[];
    let rightFrames: string[];
    if (render === reference) {
      const frames = extractFrames(
        render,
        left,
        [...requested, ...referenceTimes],
        temporary,
        `scale=${leftWidth}:${height}`,
      );
      leftFrames = frames.slice(0, requested.length);
      rightFrames = frames.slice(requested.length);
    } else {
      const leftDirectory = join(temporary, "left");
      const rightDirectory = join(temporary, "right");
      mkdirSync(leftDirectory);
      mkdirSync(rightDirectory);
      leftFrames = extractFrames(
        render,
        left,
        requested,
        leftDirectory,
        `scale=${leftWidth}:${height}`,
      );
      rightFrames = extractFrames(
        reference,
        right,
        referenceTimes,
        rightDirectory,
        `scale=${rightWidth}:${height}`,
      );
    }
    const nameOutput = outputNamer(directory);
    requested.forEach((time, index) => {
      const output = nameOutput(formatTimecode(time).replace(":", "-"));
      composeImage(
        [
          { path: leftFrames[index], label: `RENDER ${formatTimecode(time)}` },
          {
            path: rightFrames[index],
            label: `REF ${formatTimecode(referenceTimes[index])}`,
          },
        ],
        2,
        width,
        height,
        output,
      );
      paths.push(output);
    });
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  paths.forEach((path) => console.log(path));
};

/**
 * Generate `pnpm qa compare` JPGs with RENDER left and REF right, using exact
 * signed decimal offset arithmetic. Each video is extracted once for all times;
 * identical input paths share a single extraction for the combined requests.
 * Scale to the requested height, center on equal-width black cells, and cap the
 * complete image at 2000px. Annotation design is pending in qa-images.ts.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  addTime,
  composeImage,
  outputDirectory,
  parseOptions,
  positiveInteger,
} from "./qa-images.ts";
import { decimalTime, formatTimecode, parseTimecode } from "./qa-time.ts";
import { extractFrames, probeVideo, validateTimes } from "./qa-video.ts";

export const compareUsage =
  "pnpm qa compare <render> <reference> <time...> [--offset <seconds>] [--height <px>] [--out <directory>]";

export const runCompare = (args: string[]): void => {
  if (args.includes("--help")) {
    console.log(compareUsage);
    return;
  }
  const { positional, options } = parseOptions(
    args,
    ["--offset", "--height", "--out"],
    compareUsage,
  );
  if (positional.length < 3) {
    throw new Error(
      `Provide two videos and at least one time.\nUsage: ${compareUsage}`,
    );
  }
  const offsetValue = options.get("--offset") ?? "0";
  if (!/^-?\d+(?:\.\d+)?$/.test(offsetValue)) {
    throw new Error("--offset must be signed decimal seconds.");
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
    const names = new Map<string, number>();
    requested.forEach((time, index) => {
      const name = formatTimecode(time).replace(":", "-");
      const occurrence = (names.get(name) ?? 0) + 1;
      names.set(name, occurrence);
      const output = join(
        directory,
        `${name}${occurrence > 1 ? `-${occurrence}` : ""}.jpg`,
      );
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

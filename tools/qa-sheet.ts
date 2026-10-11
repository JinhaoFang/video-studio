/**
 * Generate `pnpm qa sheet` contact sheets, up to 24 labelled cells per page.
 * --every uses exact decimal steps; --count includes both endpoints (one means
 * from only). The inclusive duration endpoint displays the last video frame;
 * frames/compare retain exclusive end validation. Decode selected frames once,
 * compose pages in order, print absolute JPG paths, and clean temporary images.
 * Annotation appearance awaits design confirmation in qa-images.ts.
 */
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  addTime,
  composeImage,
  multiplyTime,
  outputDirectory,
  parseOptions,
  positiveInteger,
} from "./qa-images.ts";
import { compareTimes, formatTimecode, parseTimecode } from "./qa-time.ts";
import type { Time } from "./qa-time.ts";
import { extractFrames, probeVideo, validateTimes } from "./qa-video.ts";

export const sheetUsage =
  "pnpm qa sheet <video> [--from <time>] [--to <time>] (--every <seconds> | --count <number>) [--cols <number>] [--out <directory>]";

export const runSheet = (args: string[]): void => {
  if (args.includes("--help")) {
    console.log(sheetUsage);
    return;
  }
  const { positional, options } = parseOptions(
    args,
    ["--from", "--to", "--every", "--count", "--cols", "--out"],
    sheetUsage,
  );
  if (
    positional.length !== 1 ||
    options.has("--every") === options.has("--count")
  ) {
    throw new Error(
      `Provide one video and exactly one of --every or --count.\nUsage: ${sheetUsage}`,
    );
  }
  const columns = positiveInteger(options.get("--cols") ?? "4", "--cols");
  const from = parseTimecode(options.get("--from") ?? "0");
  const stepValue = options.get("--every");
  if (stepValue !== undefined && !/^\d+(?:\.\d+)?$/.test(stepValue)) {
    throw new Error("--every must be positive seconds.");
  }
  const step = stepValue === undefined ? undefined : parseTimecode(stepValue);
  if (step?.numerator === 0n) {
    throw new Error("--every must be positive seconds.");
  }
  const count = step
    ? undefined
    : positiveInteger(options.get("--count")!, "--count");
  const input = resolve(positional[0]);
  const video = probeVideo(input);
  const to = options.has("--to")
    ? parseTimecode(options.get("--to")!)
    : video.end;
  validateTimes(video, [from, to], true);
  if (compareTimes(from, to) > 0) {
    throw new Error("--from must not exceed --to.");
  }
  const requested: Time[] = [];
  if (step) {
    for (let index = 0n; ; index += 1n) {
      const time = addTime(from, multiplyTime(step, index));
      if (compareTimes(time, to) > 0) break;
      requested.push(time);
    }
  } else {
    const span = addTime(to, multiplyTime(from, -1n));
    for (let index = 0; index < count!; index += 1) {
      requested.push(
        count === 1
          ? from
          : addTime(
              from,
              multiplyTime(span, BigInt(index), BigInt(count! - 1)),
            ),
      );
    }
  }
  const directory = outputDirectory("sheet", input, options.get("--out"));
  mkdirSync(directory, { recursive: true });
  const temporary = mkdtempSync(join(tmpdir(), "qa-sheet-"));
  const paths: string[] = [];
  try {
    const height = Math.max(1, Math.round((480 * video.height) / video.width));
    const frames = extractFrames(
      input,
      video,
      requested,
      temporary,
      `scale=480:${height}`,
    );
    for (let start = 0; start < frames.length; start += 24) {
      const output = join(
        directory,
        `page-${String(start / 24 + 1).padStart(3, "0")}.jpg`,
      );
      const cells = frames.slice(start, start + 24).map((path, index) => ({
        path,
        label: formatTimecode(requested[start + index]),
      }));
      composeImage(cells, columns, 480, height, output);
      paths.push(output);
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  paths.forEach((path) => console.log(path));
};

/**
 * Generate `pnpm qa sheet` contact sheets, up to 24 labelled cells per page.
 * --every uses exact decimal steps; --count includes both endpoints (one means
 * from only). The inclusive duration endpoint displays the last video frame;
 * frames/compare retain exclusive end validation. Decode selected frames once,
 * compose pages in order, print absolute JPG paths, and clean temporary images.
 * Annotation appearance is established in #8 and described in qa-images.ts.
 */
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { outputDirectory, parseOptions, positiveInteger } from "./qa-common.ts";
import { composeImage } from "./qa-images.ts";
import { usageError } from "./cli.ts";
import {
  addTime,
  subtractTime,
  multiplyTime,
  compareTimes,
  formatTimecode,
  parseTimecode,
} from "./qa-time.ts";
import type { Time } from "./qa-time.ts";
import { extractFrames, probeVideo, validateTimes } from "./qa-video.ts";

export const sheetUsage =
  "pnpm qa sheet <视频> [--from <时间>] [--to <时间>] (--every <秒> | --count <张数>) [--cols <列数>] [--out <目录>]";

export const runSheet = (args: string[]): void => {
  const { positional, options, help } = parseOptions(
    args,
    ["--from", "--to", "--every", "--count", "--cols", "--out"],
    sheetUsage,
  );
  if (help) {
    console.log(`用法：${sheetUsage}`);
    return;
  }
  if (
    positional.length !== 1 ||
    options.has("--every") === options.has("--count")
  ) {
    throw usageError(
      "请提供一个视频，并且只能选择 --every 或 --count 其中一个。",
      sheetUsage,
    );
  }
  const columns = positiveInteger(options.get("--cols") ?? "4", "--cols");
  const from = parseTimecode(options.get("--from") ?? "0");
  const stepValue = options.get("--every");
  if (stepValue !== undefined && !/^\d+(?:\.\d+)?$/.test(stepValue)) {
    throw new Error("--every 必须是正数秒数。");
  }
  const step = stepValue === undefined ? undefined : parseTimecode(stepValue);
  if (step?.numerator === 0n) {
    throw new Error("--every 必须是正数秒数。");
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
    throw new Error("--from 不能超过 --to。");
  }
  const requested: Time[] = [];
  if (step) {
    for (let index = 0n; ; index += 1n) {
      const time = addTime(from, multiplyTime(step, index));
      if (compareTimes(time, to) > 0) break;
      requested.push(time);
    }
  } else {
    const span = subtractTime(to, from);
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
    for (const name of readdirSync(directory)) {
      if (/^page-.*\.jpg$/.test(name)) rmSync(join(directory, name));
    }
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

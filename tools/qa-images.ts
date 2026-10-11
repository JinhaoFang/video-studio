/**
 * Shared image command options, exact time arithmetic, and JPG composition.
 * Compose already-sized cells on black padding and cap the complete image at
 * 2000px without changing aspect ratio. TODO(design): confirm FFmpeg's default
 * font, white 24px labels, opaque black boxes, 6px inset/border, and black padding.
 * These conservative QA annotations keep ASCII labels readable on light/dark
 * media; they are not episode design tokens. No shell or media paths enter filters.
 */
import { basename, extname, join, resolve } from "node:path";
import { runMedia } from "./qa-video.ts";
import type { Time } from "./qa-time.ts";

export const parseOptions = (
  args: string[],
  allowed: string[],
  usage: string,
) => {
  const positional: string[] = [];
  const options = new Map<string, string>();
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg.startsWith("--")) {
      positional.push(arg);
    } else {
      if (!allowed.includes(arg)) {
        throw new Error(`Unknown option: ${arg}\nUsage: ${usage}`);
      }
      if (
        options.has(arg) ||
        !args[index + 1] ||
        args[index + 1].startsWith("--")
      ) {
        throw new Error(
          `Provide ${arg} exactly once with a value.\nUsage: ${usage}`,
        );
      }
      options.set(arg, args[++index]);
    }
  }
  return { positional, options };
};

export const positiveInteger = (value: string, option: string): number => {
  const number = Number(value);
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(number) || number <= 0) {
    throw new Error(`${option} must be a positive integer.`);
  }
  return number;
};

export const addTime = (a: Time, b: Time): Time => ({
  numerator: a.numerator * b.denominator + b.numerator * a.denominator,
  denominator: a.denominator * b.denominator,
});

export const multiplyTime = (
  time: Time,
  numerator: bigint,
  denominator = 1n,
): Time => ({
  numerator: time.numerator * numerator,
  denominator: time.denominator * denominator,
});

export const outputDirectory = (
  command: string,
  input: string,
  out?: string,
): string =>
  resolve(out ?? join("out", "qa", command, basename(input, extname(input))));

export const composeImage = (
  cells: { path: string; label: string }[],
  columns: number,
  width: number,
  height: number,
  output: string,
): void => {
  const filters = cells.map(
    (cell, index) =>
      `[${index}:v]format=rgb24,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:color=black,` +
      `drawtext=text='${cell.label.replaceAll(":", "\\:")}':fontcolor=white:fontsize=24:box=1:boxcolor=black:boxborderw=6:x=6:y=h-th-6[c${index}]`,
  );
  const layout = cells
    .map(
      (_, index) =>
        `${(index % columns) * width}_${Math.floor(index / columns) * height}`,
    )
    .join("|");
  const stacked =
    cells.length === 1
      ? "[c0]null[stacked]"
      : `${cells.map((_, index) => `[c${index}]`).join("")}xstack=inputs=${cells.length}:layout=${layout}:fill=black[stacked]`;
  filters.push(stacked);
  filters.push(
    `[stacked]pad=${columns * width}:${Math.ceil(cells.length / columns) * height}:0:0:color=black,` +
      "scale=w='min(2000,iw)':h='min(2000,ih)':force_original_aspect_ratio=decrease,setsar=1[out]",
  );
  runMedia("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-y",
    ...cells.flatMap((cell) => ["-threads", "1", "-i", cell.path]),
    "-filter_complex_threads",
    "1",
    "-filter_complex",
    filters.join(";"),
    "-map",
    "[out]",
    "-frames:v",
    "1",
    "-q:v",
    "2",
    "-pix_fmt",
    "yuvj444p",
    "-threads",
    "1",
    "-f",
    "image2",
    "-update",
    "1",
    output,
  ]);
};

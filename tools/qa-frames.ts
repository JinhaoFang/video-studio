/**
 * Implement `pnpm qa frames <video> <times...> [--out <directory>]`.
 * Probe all decoded presentation timestamps, select the last frame at/before
 * each exact time, then extract all distinct selected indices in one ffmpeg pass.
 * Times are relative to the first displayed video frame, including VFR gaps.
 * Outputs are unlabelled JPEGs capped at 2000px; rounded filename collisions
 * receive numeric suffixes. Full timestamp probing favors accuracy over speed.
 */
import { copyFileSync, mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, extname, join, resolve } from "node:path";
import { formatTimecode, parseTimecode } from "./qa-time.ts";
import { extractFrames, probeVideo, validateTimes } from "./qa-video.ts";

export const framesUsage =
  "pnpm qa frames <video> <time...> [--out <directory>]";

export const runFrames = (args: string[]): void => {
  if (args.includes("--help")) {
    console.log(`${framesUsage}\nTimes: 12.5, 01:12.5, 00:01:12.500`);
    return;
  }
  const positional: string[] = [];
  let out: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--out") {
      if (
        out !== undefined ||
        !args[index + 1] ||
        args[index + 1].startsWith("--")
      ) {
        throw new Error(
          `Provide --out exactly once with a directory.\nUsage: ${framesUsage}`,
        );
      }
      out = args[++index];
    } else if (arg.startsWith("--")) {
      throw new Error(`Unknown option: ${arg}\nUsage: ${framesUsage}`);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length < 2) {
    throw new Error(
      `Provide a video and at least one time.\nUsage: ${framesUsage}`,
    );
  }
  const [input, ...inputs] = positional;
  const requested = inputs.map(parseTimecode);
  const video = resolve(input);
  const probe = probeVideo(video);
  validateTimes(probe, requested);
  const directory = resolve(
    out ?? join("out", "qa", "frames", basename(video, extname(video))),
  );
  mkdirSync(directory, { recursive: true });
  const names = new Map<string, number>();
  const paths: string[] = [];
  for (const time of requested) {
    const name = formatTimecode(time).replace(":", "-");
    const occurrence = (names.get(name) ?? 0) + 1;
    names.set(name, occurrence);
    const output = join(
      directory,
      `${name}${occurrence > 1 ? `-${occurrence}` : ""}.jpg`,
    );
    paths.push(output);
  }
  const temporary = mkdtempSync(join(tmpdir(), "qa-frames-"));
  try {
    const extracted = extractFrames(
      video,
      probe,
      requested,
      temporary,
      "scale=w='min(2000,iw)':h='min(2000,ih)':force_original_aspect_ratio=decrease",
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

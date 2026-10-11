/**
 * Implement `pnpm qa frames <video> <times...> [--out <directory>]`.
 * Probe all decoded presentation timestamps, select the last frame at/before
 * each exact time, then decode from the beginning and select by frame index.
 * Times are relative to the first displayed video frame, including VFR gaps.
 * Outputs are unlabelled JPEGs capped at 2000px; rounded filename collisions
 * receive numeric suffixes. Full timestamp probing favors accuracy over speed.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, statSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";
import {
  compareTimes,
  decimalTime,
  formatTimecode,
  parseTimecode,
} from "./qa-time.ts";
import type { Time } from "./qa-time.ts";

type Probe = {
  streams: {
    time_base: string;
    start_pts?: number;
    duration_ts?: number;
  }[];
  frames: {
    best_effort_timestamp?: number;
    pkt_duration?: number;
    duration?: number;
  }[];
  format: { duration?: string; start_time?: string };
};

const runMedia = (program: "ffmpeg" | "ffprobe", args: string[]): string => {
  const result = spawnSync(program, args, {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) {
    if ((result.error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `${program} is not installed or is not on PATH. Install ffmpeg (including ffprobe) and retry.`,
      );
    }
    throw new Error(`${program}: ${result.error.message}`);
  }
  if (result.status !== 0) {
    throw new Error(
      `${program} failed: ${result.stderr.trim() || `exit ${result.status}`}`,
    );
  }
  return result.stdout;
};

const probeVideo = (video: string): { times: Time[]; end: Time } => {
  const probe: Probe = JSON.parse(
    runMedia("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_streams",
      "-show_frames",
      "-show_format",
      "-show_entries",
      "stream=time_base,start_pts,duration_ts:frame=best_effort_timestamp,pkt_duration,duration:format=duration,start_time",
      "-of",
      "json",
      video,
    ]),
  );
  const stream = probe.streams[0];
  if (!stream || !probe.frames?.length) {
    throw new Error(`No decodable video frames: ${video}`);
  }
  const [numerator, denominator] = stream.time_base.split("/").map(BigInt);
  const first = probe.frames[0].best_effort_timestamp;
  if (!Number.isSafeInteger(first) || numerator <= 0n || denominator <= 0n) {
    throw new Error(`Cannot determine exact video timestamps: ${video}`);
  }
  const origin = BigInt(first!);
  const ticks = (value: bigint): Time => ({
    numerator: value * numerator,
    denominator,
  });
  const times = probe.frames.map((frame) => {
    if (!Number.isSafeInteger(frame.best_effort_timestamp)) {
      throw new Error(
        `Missing or unsafe video presentation timestamp: ${video}`,
      );
    }
    return ticks(BigInt(frame.best_effort_timestamp!) - origin);
  });
  if (
    times.some(
      (time, index) => index > 0 && compareTimes(time, times[index - 1]) < 0,
    )
  ) {
    throw new Error(`Video presentation timestamps are not ordered: ${video}`);
  }
  const last = probe.frames.at(-1)!;
  const lastDuration = last.duration ?? last.pkt_duration;
  let end: Time;
  if (Number.isSafeInteger(stream.duration_ts) && stream.duration_ts! > 0) {
    end = ticks(
      BigInt(stream.start_pts ?? first!) + BigInt(stream.duration_ts!) - origin,
    );
  } else if (Number.isSafeInteger(lastDuration) && lastDuration! > 0) {
    end = ticks(
      BigInt(last.best_effort_timestamp!) - origin + BigInt(lastDuration!),
    );
  } else if (probe.format.duration && probe.format.duration !== "N/A") {
    const duration = decimalTime(probe.format.duration);
    const start = decimalTime(probe.format.start_time ?? "0");
    const absoluteEnd = {
      numerator:
        duration.numerator * start.denominator +
        start.numerator * duration.denominator,
      denominator: duration.denominator * start.denominator,
    };
    end = {
      numerator:
        absoluteEnd.numerator * denominator -
        origin * numerator * absoluteEnd.denominator,
      denominator: absoluteEnd.denominator * denominator,
    };
  } else {
    throw new Error(`Cannot determine video duration: ${video}`);
  }
  if (compareTimes(end, times.at(-1)!) <= 0) {
    throw new Error(`Invalid video duration: ${video}`);
  }
  return { times, end };
};

const frameAt = (times: Time[], time: Time): number => {
  let from = 0;
  let to = times.length;
  while (from < to) {
    const middle = Math.floor((from + to) / 2);
    if (compareTimes(times[middle], time) <= 0) {
      from = middle + 1;
    } else {
      to = middle;
    }
  }
  return from - 1;
};

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
  if (!statSync(video).isFile()) {
    throw new Error(`Not a video file: ${video}`);
  }
  runMedia("ffmpeg", ["-version"]);
  const { times, end } = probeVideo(video);
  for (let index = 0; index < requested.length; index += 1) {
    if (compareTimes(requested[index], end) >= 0) {
      throw new Error(
        `Time ${inputs[index]} is outside video duration (${formatTimecode(end)}; end is exclusive).`,
      );
    }
  }
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
    runMedia("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-nostdin",
      "-y",
      "-i",
      video,
      "-map",
      "0:v:0",
      "-vf",
      `select=eq(n\\,${frameAt(times, time)}),scale=w='min(2000,iw)':h='min(2000,ih)':force_original_aspect_ratio=decrease`,
      "-vsync",
      "0",
      "-frames:v",
      "1",
      "-q:v",
      "2",
      "-threads",
      "1",
      "-f",
      "image2",
      "-update",
      "1",
      output,
    ]);
    if (!statSync(output).size) {
      throw new Error(`ffmpeg did not produce a frame: ${output}`);
    }
    paths.push(output);
  }
  for (const path of paths) {
    console.log(path);
  }
};

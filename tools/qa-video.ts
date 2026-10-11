/**
 * Shared exact-timestamp probing and batch frame extraction for QA commands.
 * Probe presentation timestamps relative to the first displayed frame; choose
 * the last frame at/before each request, preserving boundary and VFR accuracy.
 * One ffmpeg extraction pass per video selects all distinct indices in order;
 * repeated/unsorted requests map back to those files. ffprobe separately scans
 * timestamps. Display dimensions include sample aspect ratio.
 */
import { spawnSync } from "node:child_process";
import { statSync } from "node:fs";
import { join } from "node:path";
import { compareTimes, decimalTime, formatTimecode } from "./qa-time.ts";
import type { Time } from "./qa-time.ts";

type Probe = {
  streams: {
    time_base: string;
    width: number;
    height: number;
    sample_aspect_ratio?: string;
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

export const runMedia = (
  program: "ffmpeg" | "ffprobe",
  args: string[],
): string => {
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

export type Video = { times: Time[]; end: Time; width: number; height: number };

export const probeVideo = (video: string): Video => {
  if (!statSync(video).isFile()) {
    throw new Error(`Not a video file: ${video}`);
  }
  runMedia("ffmpeg", ["-version"]);
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
      "stream=time_base,start_pts,duration_ts,width,height,sample_aspect_ratio:frame=best_effort_timestamp,pkt_duration,duration:format=duration,start_time",
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
  const [sarWidth, sarHeight] = (stream.sample_aspect_ratio ?? "1:1")
    .split(":")
    .map(Number);
  const sar = sarWidth > 0 && sarHeight > 0 ? sarWidth / sarHeight : 1;
  return { times, end, width: stream.width * sar, height: stream.height };
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

export const validateTimes = (
  video: Video,
  requested: Time[],
  allowEnd = false,
): void => {
  for (const time of requested) {
    const comparison = compareTimes(time, video.end);
    if (
      time.numerator < 0n ||
      comparison > 0 ||
      (!allowEnd && comparison === 0)
    ) {
      const label =
        time.numerator < 0n
          ? `-${formatTimecode({ ...time, numerator: -time.numerator })}`
          : formatTimecode(time);
      throw new Error(
        `Time ${label} is outside video duration (${formatTimecode(video.end)}${allowEnd ? "" : "; end is exclusive"}).`,
      );
    }
  }
};

export const extractFrames = (
  input: string,
  video: Video,
  requested: Time[],
  directory: string,
  scale: string,
  extension: "jpg" | "png" = "png",
): string[] => {
  const indices = requested.map((time) => frameAt(video.times, time));
  const unique = [...new Set(indices)].sort((a, b) => a - b);
  const paths = unique.map((_, index) =>
    join(directory, `${String(index + 1).padStart(6, "0")}.${extension}`),
  );
  runMedia("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-y",
    "-threads",
    "1",
    "-i",
    input,
    "-map",
    "0:v:0",
    "-vf",
    `select='${unique.map((index) => `eq(n,${index})`).join("+")}',${scale},setsar=1`,
    "-vsync",
    "0",
    "-frames:v",
    String(unique.length),
    "-q:v",
    "2",
    "-threads",
    "1",
    "-f",
    "image2",
    join(directory, `%06d.${extension}`),
  ]);
  for (const path of paths) {
    if (!statSync(path).size) {
      throw new Error(`ffmpeg did not produce a frame: ${path}`);
    }
  }
  const byIndex = new Map(unique.map((index, order) => [index, paths[order]]));
  return indices.map((index) => byIndex.get(index)!);
};

/**
 * Scan native presentation frames with `pnpm qa motion <video> --help`.
 * Area-resize to 160x90 RGB, blur at sigma 1, then average absolute channel
 * differences above a configurable 8-bit deadband, normalized to [0,1]. Still
 * runs compare against their first frame so slow accumulated motion breaks a
 * run. Flash candidates must leave and return to a preceding frame within the
 * maximum duration, reaching the flash threshold before returning. Collect only
 * completed candidates, then select the earliest nonoverlapping excursions so
 * persistent cuts cannot mask flashes and faded flashes retain their full span.
 * Decode to a temporary raw file; keep only anchors, short-lived candidates and
 * completed event metadata in memory.
 * Range endpoints use player time and are exclusive at the end. Optional JPGs
 * reuse exact-timestamp extraction. Defaults calibrated against spec #60's
 * reference opening and #61's plain render; findings need human review.
 */
import {
  closeSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  openSync,
  readSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import {
  imageScale,
  outputDirectory,
  parseOptions,
  runMedia,
} from "./qa-common.ts";
import { usageError } from "./cli.ts";
import { compareTimes, formatTimecode, parseTimecode } from "./qa-time.ts";
import type { Time } from "./qa-time.ts";
import { extractFrames, probeVideo, validateTimes } from "./qa-video.ts";

export const motionUsage =
  "pnpm qa motion <视频> [--from <时间>] [--to <时间>] [--still-seconds <秒>] [--still-diff <数值>] [--flash-seconds <秒>] [--flash-diff <数值>] [--noise-floor <数值>] [--keyframes <目录>] [--out <目录>]";

const defaults = {
  stillSeconds: 3,
  stillDiff: 0.003,
  flashSeconds: 0.25,
  flashDiff: 0.03,
  noiseFloor: 2,
};
const frameBytes = 160 * 90 * 3;
const seconds = (time: Time): number =>
  Number(time.numerator) / Number(time.denominator);
const label = (value: number): string =>
  formatTimecode(parseTimecode(value.toFixed(9)));

type Finding = {
  type: "still" | "flash";
  startSeconds: number;
  endSeconds: number;
  durationSeconds: number;
  maxDifference: number;
  returnDifference: number | null;
  keyframes: { role: string; seconds: number; path: string }[];
};
type Event = {
  finding: Finding;
  frames: { role: string; index: number }[];
};

export const runMotion = (args: string[]): void => {
  const { positional, options, help } = parseOptions(
    args,
    [
      "--from",
      "--to",
      "--still-seconds",
      "--still-diff",
      "--flash-seconds",
      "--flash-diff",
      "--noise-floor",
      "--keyframes",
      "--out",
    ],
    motionUsage,
  );
  if (help) {
    console.log(`用法：${motionUsage}
--from：扫描起点，默认 0；--to：扫描终点，默认视频结尾，不含该时刻。
时间接受秒数、分:秒、时:分:秒；零点为文件/播放器时间轴起点。
--still-seconds：静止最短时长，默认 ${defaults.stillSeconds} 秒（含边界）。
--still-diff：静止区间各帧相对首帧的最大差异，默认 ${defaults.stillDiff}。
--flash-seconds：变化后恢复原画面的最长时长，默认 ${defaults.flashSeconds} 秒（含边界）。
--flash-diff：闪现相对变化前画面的最小峰值差异，默认 ${defaults.flashDiff}。
恢复差异须不超过 --still-diff；--flash-diff 必须大于 --still-diff。
--noise-floor：每通道忽略的 8 位差值，默认 ${defaults.noiseFloor}，范围 0～255（不含 255）。
差异数值为 160×90 彩图经 sigma=1 模糊后 max(绝对通道差值-噪声阈值,0) 的均值 / 255，范围 0～1。
比较区间首帧可累计缓慢推拉的位移；保留原视频帧率，不跳过单帧闪现。
--keyframes：可选关键帧目录；每个区间输出三张 JPG，默认不输出。
--out：报告目录，默认 out/qa/motion/<视频名>；写入 motion.json。
退出码：0 没有可疑区间；1 发现可疑区间；2 参数或运行错误。
这是复核线索；有意停留、快速动画也可能被报告，低于空间/差异阈值的细小运动可能被忽略。`);
    return;
  }
  if (positional.length !== 1) {
    throw usageError("请提供一个视频。", motionUsage);
  }
  const numeric = (name: string, fallback: number): number => {
    const value = options.get(name) ?? String(fallback);
    if (!/^\d+(?:\.\d+)?$/.test(value) || !Number.isFinite(Number(value))) {
      throw new Error(`${name} 必须是有限非负数。`);
    }
    return Number(value);
  };
  const thresholds = {
    stillSeconds: numeric("--still-seconds", defaults.stillSeconds),
    stillDiff: numeric("--still-diff", defaults.stillDiff),
    flashSeconds: numeric("--flash-seconds", defaults.flashSeconds),
    flashDiff: numeric("--flash-diff", defaults.flashDiff),
    noiseFloor: numeric("--noise-floor", defaults.noiseFloor),
  };
  if (thresholds.stillSeconds <= 0 || thresholds.flashSeconds <= 0) {
    throw new Error("--still-seconds 和 --flash-seconds 必须大于 0。");
  }
  if (
    thresholds.stillDiff > 1 ||
    thresholds.flashDiff > 1 ||
    thresholds.flashDiff <= thresholds.stillDiff
  ) {
    throw new Error(
      "差异阈值必须在 0～1 内，且 --flash-diff 大于 --still-diff。",
    );
  }
  if (thresholds.noiseFloor >= 255) {
    throw new Error("--noise-floor 必须小于 255。");
  }
  const from = parseTimecode(options.get("--from") ?? "0");
  const input = resolve(positional[0]);
  const video = probeVideo(input);
  const to = options.has("--to")
    ? parseTimecode(options.get("--to")!)
    : video.end;
  validateTimes(video, [from, to], true);
  if (compareTimes(from, to) >= 0) {
    throw new Error("--from 必须小于 --to。");
  }
  const afterStart = video.times.findIndex(
    (time) => compareTimes(time, from) > 0,
  );
  const first = (afterStart < 0 ? video.times.length : afterStart) - 1;
  const boundary = video.times.findIndex((time) => compareTimes(time, to) >= 0);
  const stop = boundary < 0 ? video.times.length : boundary;
  const times = video.times.slice(first, stop).map(seconds);
  times[0] = seconds(from);
  const end = seconds(to);
  const difference = (a: Buffer, b: Buffer): number => {
    let sum = 0;
    for (let index = 0; index < frameBytes; index++) {
      sum += Math.max(0, Math.abs(a[index] - b[index]) - thresholds.noiseFloor);
    }
    return sum / frameBytes / 255;
  };
  const events: Event[] = [];
  const flashes: Event[] = [];
  let longestStillSeconds = 0;
  let maxAdjacentDifference = 0;
  let maxFrameGapSeconds = 0;
  const temporary = mkdtempSync(join(tmpdir(), "qa-motion-"));
  try {
    const raw = join(temporary, "frames.rgb");
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
      `trim=start_frame=${first}:end_frame=${stop},scale=160:90:flags=area,format=rgb24,gblur=sigma=1`,
      "-vsync",
      "0",
      "-frames:v",
      String(times.length),
      "-pix_fmt",
      "rgb24",
      "-threads",
      "1",
      "-f",
      "rawvideo",
      raw,
    ]);
    if (statSync(raw).size !== times.length * frameBytes) {
      throw new Error("解码帧数与视频时间戳不一致，无法完成动态自检。");
    }
    const descriptor = openSync(raw, "r");
    let anchor = Buffer.alloc(0);
    let previous = Buffer.alloc(0);
    let start = 0;
    let maxDifference = 0;
    let candidates: {
      before: Buffer;
      start: number;
      peak: number;
      maxDifference: number;
    }[] = [];
    const finishStill = (stopIndex: number, endSeconds: number): void => {
      const durationSeconds = endSeconds - times[start];
      longestStillSeconds = Math.max(longestStillSeconds, durationSeconds);
      if (durationSeconds + 1e-9 >= thresholds.stillSeconds) {
        events.push({
          finding: {
            type: "still",
            startSeconds: times[start],
            endSeconds,
            durationSeconds,
            maxDifference,
            returnDifference: null,
            keyframes: [],
          },
          frames: [
            { role: "start", index: start },
            { role: "middle", index: Math.floor((start + stopIndex - 1) / 2) },
            { role: "end", index: stopIndex - 1 },
          ],
        });
      }
    };
    try {
      for (let index = 0; index < times.length; index++) {
        const frame = Buffer.alloc(frameBytes);
        if (
          readSync(descriptor, frame, 0, frameBytes, index * frameBytes) !==
          frameBytes
        ) {
          throw new Error("无法完整读取解码帧。");
        }
        if (index === 0) {
          anchor = frame;
          previous = frame;
          continue;
        }
        maxFrameGapSeconds = Math.max(
          maxFrameGapSeconds,
          times[index] - times[index - 1],
        );
        const drift = difference(anchor, frame);
        if (drift > thresholds.stillDiff) {
          finishStill(index, times[index]);
          anchor = frame;
          start = index;
          maxDifference = 0;
        } else {
          maxDifference = Math.max(maxDifference, drift);
        }
        const adjacent = difference(previous, frame);
        maxAdjacentDifference = Math.max(maxAdjacentDifference, adjacent);
        candidates = candidates.filter((candidate) => {
          if (
            times[index] - times[candidate.start] >
            thresholds.flashSeconds + 1e-9
          ) {
            return false;
          }
          const distance = difference(candidate.before, frame);
          if (distance > candidate.maxDifference) {
            candidate.maxDifference = distance;
            candidate.peak = index;
          }
          if (
            candidate.maxDifference < thresholds.flashDiff ||
            distance > thresholds.stillDiff
          ) {
            return true;
          }
          flashes.push({
            finding: {
              type: "flash",
              startSeconds: times[candidate.start],
              endSeconds: times[index],
              durationSeconds: times[index] - times[candidate.start],
              maxDifference: candidate.maxDifference,
              returnDifference: distance,
              keyframes: [],
            },
            frames: [
              { role: "before", index: candidate.start - 1 },
              { role: "peak", index: candidate.peak },
              { role: "after", index },
            ],
          });
          return false;
        });
        if (adjacent > thresholds.stillDiff) {
          candidates.push({
            before: previous,
            start: index,
            peak: index,
            maxDifference: adjacent,
          });
        }
        previous = frame;
      }
      finishStill(times.length, end);
      maxFrameGapSeconds = Math.max(maxFrameGapSeconds, end - times.at(-1)!);
    } finally {
      closeSync(descriptor);
    }
    let lastFlashEnd = -Infinity;
    flashes.sort((a, b) => a.finding.startSeconds - b.finding.startSeconds);
    for (const flash of flashes) {
      if (flash.finding.startSeconds > lastFlashEnd) {
        events.push(flash);
        lastFlashEnd = flash.finding.endSeconds;
      }
    }
    events.sort((a, b) => a.finding.startSeconds - b.finding.startSeconds);
    if (options.has("--keyframes") && events.length > 0) {
      const directory = resolve(options.get("--keyframes")!);
      mkdirSync(directory, { recursive: true });
      const requested = events.flatMap((event) =>
        event.frames.map((frame) => video.times[first + frame.index]),
      );
      const extracted = extractFrames(
        input,
        video,
        requested,
        temporary,
        imageScale,
        "jpg",
      );
      let offset = 0;
      events.forEach((event, eventIndex) => {
        event.finding.keyframes = event.frames.map((frame) => {
          const path = join(
            directory,
            `interval-${String(eventIndex + 1).padStart(3, "0")}-${frame.role}.jpg`,
          );
          copyFileSync(extracted[offset++], path);
          return {
            role: frame.role,
            seconds: seconds(video.times[first + frame.index]),
            path,
          };
        });
      });
    }
  } finally {
    rmSync(temporary, { recursive: true, force: true });
  }
  const findings = events.map((event) => event.finding);
  const directory = outputDirectory("motion", input, options.get("--out"));
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "motion.json");
  writeFileSync(
    path,
    `${JSON.stringify(
      {
        input,
        range: { fromSeconds: seconds(from), toSeconds: end },
        thresholds,
        analysis: {
          width: 160,
          height: 90,
          blurSigma: 1,
          frameCount: times.length,
          longestStillSeconds,
          maxAdjacentDifference,
          maxFrameGapSeconds,
        },
        findings,
        passed: findings.length === 0,
      },
      null,
      2,
    )}\n`,
  );
  console.log(
    `输入： ${input}\n扫描： ${label(seconds(from))}～${label(end)}，共 ${times.length} 帧`,
  );
  for (const finding of findings) {
    console.log(
      `${finding.type === "still" ? "静止" : "闪现"}： ${label(finding.startSeconds)}～${label(finding.endSeconds)}；持续 ${finding.durationSeconds.toFixed(6)} 秒；最大差异 ${finding.maxDifference.toFixed(6)}${finding.returnDifference === null ? "" : `；恢复差异 ${finding.returnDifference.toFixed(6)}`}`,
    );
  }
  console.log(
    `结果： ${findings.length ? `发现 ${findings.length} 个可疑区间，需人工复核` : "通过，未发现可疑区间"}`,
  );
  console.log(path);
  if (findings.length > 0) {
    console.error("出错：动态自检发现可疑区间，请复核报告。");
    process.exitCode = 1;
  }
};

/**
 * Resolve sentence-relative points with `pnpm qa sentence --help`.
 * Offsets are nonnegative and rounded to the nearest frame, within the spoken
 * interval [startFrame, endFrame). Default stdout is only decimal seconds for
 * compare; it rounds upward below 1ns so exact frame boundaries never step back.
 */
import { readFileSync } from "node:fs";
import { parseOptions } from "./qa-common.ts";
import { usageError } from "./cli.ts";
import type { Timeline } from "./timeline.ts";

export const sentenceUsage =
  "pnpm qa sentence <时间轴.json> <句子编号> [--offset-seconds <秒> | --offset-frames <帧>] [--format <seconds|frames|json>]";

export const sentencePoint = (
  timeline: Timeline,
  id: string,
  offsetFrames = 0,
) => {
  if (
    !timeline ||
    timeline.version !== 1 ||
    !Number.isSafeInteger(timeline.fps) ||
    timeline.fps <= 0 ||
    !Number.isSafeInteger(timeline.durationInFrames) ||
    timeline.durationInFrames <= 0 ||
    !Array.isArray(timeline.lines) ||
    !timeline.source ||
    !["temporary", "elevenlabs"].includes(timeline.source.kind)
  )
    throw new Error("时间轴格式无效，请使用版本 1 的按句时间轴。");
  let previousEnd = 0;
  const ids = new Set<string>();
  for (const line of timeline.lines) {
    if (
      !line ||
      !/^L\d{3,}$/.test(line.id) ||
      ids.has(line.id) ||
      !Number.isSafeInteger(line.startFrame) ||
      !Number.isSafeInteger(line.endFrame) ||
      line.startFrame < previousEnd ||
      line.endFrame <= line.startFrame ||
      line.endFrame > timeline.durationInFrames
    )
      throw new Error("时间轴句子编号或起止帧无效。");
    ids.add(line.id);
    previousEnd = line.endFrame;
  }
  const line = timeline.lines.find((entry) => entry.id === id);
  if (!line) throw new Error(`时间轴找不到句子编号：${id}`);
  if (
    !Number.isSafeInteger(offsetFrames) ||
    offsetFrames < 0 ||
    line.startFrame + offsetFrames >= line.endFrame
  )
    throw new Error(`${id} 的偏移必须在句内，且是非负整数帧。`);
  const frame = line.startFrame + offsetFrames;
  const seconds =
    Number(
      (BigInt(frame) * 1_000_000_000n + BigInt(timeline.fps) - 1n) /
        BigInt(timeline.fps),
    ) / 1e9;
  return { id, frame, seconds, fps: timeline.fps, source: timeline.source };
};

export const runSentence = (args: string[]): void => {
  const { positional, options, help } = parseOptions(
    args,
    ["--offset-seconds", "--offset-frames", "--format"],
    sentenceUsage,
  );
  if (help) {
    console.log(
      `用法：${sentenceUsage}\n默认只输出秒数，供 compare 使用；偏移按最近帧取整，不能超出该句。`,
    );
    return;
  }
  if (positional.length !== 2 || !/^L\d{3,}$/.test(positional[1]))
    throw usageError("请提供时间轴和句子编号（如 L001）。", sentenceUsage);
  if (options.has("--offset-seconds") && options.has("--offset-frames"))
    throw usageError("秒偏移和帧偏移只能选一种。", sentenceUsage);
  const format = options.get("--format") ?? "seconds";
  if (!["seconds", "frames", "json"].includes(format))
    throw usageError("输出格式必须是 seconds、frames 或 json。", sentenceUsage);
  const value =
    options.get("--offset-seconds") ?? options.get("--offset-frames") ?? "0";
  if (
    !/^\d+(?:\.\d+)?$/.test(value) ||
    !Number.isFinite(Number(value)) ||
    (options.has("--offset-frames") && !/^\d+$/.test(value))
  )
    throw usageError("偏移须为非负秒数或非负整数帧。", sentenceUsage);
  const timeline = JSON.parse(readFileSync(positional[0], "utf8")) as Timeline;
  sentencePoint(timeline, positional[1]);
  const offsetFrames = options.has("--offset-seconds")
    ? Math.round(Number(value) * timeline.fps)
    : Number(value);
  const point = sentencePoint(timeline, positional[1], offsetFrames);
  console.log(
    format === "json"
      ? JSON.stringify(point)
      : format === "frames"
        ? point.frame
        : point.seconds,
  );
};

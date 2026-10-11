/**
 * Measure the first audio stream over the entire input with ffmpeg ebur128's
 * final summary (BS.1770 / EBU R128), enabling true-peak oversampling. Run via
 * `pnpm qa loudness <file> --help`. Print a summary and overwrite loudness.json
 * in the requested directory; thresholds are optional and inclusive. Silent
 * audio has negative-infinite LUFS/dBTP, represented as "-Infinity" in JSON.
 * Summary precision is 0.1 LU/dB. The true-peak summary labels its values dBFS;
 * because peak=true enables oversampling, these are reported here as dBTP.
 * No measurement or threshold changes the source media or sets a mix target.
 */
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import { parseOptions, outputDirectory, runMedia } from "./qa-common.ts";
import { usageError } from "./cli.ts";

type Level = number | "-Infinity";

const readLevel = (value: unknown, name: string): Level => {
  if (value === "-inf") {
    return "-Infinity";
  }
  if (typeof value !== "string" || !Number.isFinite(Number(value))) {
    throw new Error(`ffmpeg 返回了无效的 ${name} 测量值。`);
  }
  return Number(value);
};

const numericLevel = (value: Level): number =>
  value === "-Infinity" ? -Infinity : value;

const displayLevel = (value: Level): string =>
  typeof value === "number" ? value.toFixed(2) : value;

export const loudnessUsage =
  "pnpm qa loudness <文件> [--target-lufs <数值>] [--tolerance <LU>] [--max-true-peak <dBTP>] [--out <目录>]";

export const runLoudness = (args: string[]): void => {
  const { positional, options, help } = parseOptions(
    args,
    ["--target-lufs", "--tolerance", "--max-true-peak", "--out"],
    loudnessUsage,
  );
  if (help) {
    console.log(
      `用法：${loudnessUsage}\n--target-lufs 和 --tolerance 必须一起提供；不设默认阈值。`,
    );
    return;
  }
  if (positional.length !== 1) {
    throw usageError("请提供一个输入文件。", loudnessUsage);
  }
  if (options.has("--target-lufs") !== options.has("--tolerance")) {
    throw usageError(
      "--target-lufs 和 --tolerance 必须一起提供。",
      loudnessUsage,
    );
  }
  const numericOption = (name: string): number | null => {
    const value = options.get(name);
    if (value === undefined) {
      return null;
    }
    if (
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) ||
      !Number.isFinite(Number(value))
    ) {
      throw new Error(`${name} 必须是有限数值。`);
    }
    return Number(value);
  };
  const thresholds = {
    targetLufs: numericOption("--target-lufs"),
    toleranceLu: numericOption("--tolerance"),
    maxTruePeakDbtp: numericOption("--max-true-peak"),
  };
  if (thresholds.toleranceLu !== null && thresholds.toleranceLu < 0) {
    throw new Error("--tolerance 必须非负。");
  }
  const input = resolve(positional[0]);
  if (!statSync(input).isFile()) {
    throw new Error(`不是媒体文件： ${input}`);
  }
  const probe: { streams: unknown[] } = JSON.parse(
    runMedia("ffprobe", [
      "-v",
      "error",
      "-select_streams",
      "a:0",
      "-show_entries",
      "stream=index",
      "-of",
      "json",
      input,
    ]),
  );
  if (!probe.streams.length) {
    throw new Error(`没有音轨： ${input}`);
  }
  const output = runMedia(
    "ffmpeg",
    [
      "-hide_banner",
      "-nostats",
      "-nostdin",
      "-i",
      input,
      "-map",
      "0:a:0",
      "-af",
      "ebur128=peak=true:framelog=verbose",
      "-f",
      "null",
      "-",
    ],
    "stderr",
  );
  const summaryIndex = output.lastIndexOf("Summary:");
  if (summaryIndex < 0) {
    throw new Error("ffmpeg 未返回响度摘要。");
  }
  const summary = output.slice(summaryIndex);
  const truePeakDbtp = readLevel(
    summary.match(/\bPeak:\s*(-inf|[-\d.]+)\s+dBFS/)?.[1],
    "真峰值",
  );
  const integratedLufs = readLevel(
    summary.match(/\bI:\s*(-inf|[-\d.]+)\s+LUFS/)?.[1],
    "整片响度",
  );
  const measurements = {
    integratedLufs:
      truePeakDbtp === "-Infinity" ? ("-Infinity" as const) : integratedLufs,
    loudnessRangeLu: readLevel(
      summary.match(/\bLRA:\s*([-\d.]+)\s+LU/)?.[1],
      "LRA",
    ),
    truePeakDbtp,
  };
  const integratedValue = numericLevel(measurements.integratedLufs);
  const roundingSlack =
    Number.EPSILON * Math.max(1, Math.abs(thresholds.targetLufs ?? 0)) * 4;
  const checks = {
    integrated:
      thresholds.targetLufs === null
        ? null
        : Math.abs(integratedValue - thresholds.targetLufs) <=
          thresholds.toleranceLu! + roundingSlack,
    truePeak:
      thresholds.maxTruePeakDbtp === null
        ? null
        : numericLevel(measurements.truePeakDbtp) <= thresholds.maxTruePeakDbtp,
  };
  const checked = Object.values(checks).filter((value) => value !== null);
  const passed = checked.length ? checked.every(Boolean) : null;
  const directory = outputDirectory("loudness", input, options.get("--out"));
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "loudness.json");
  writeFileSync(
    path,
    `${JSON.stringify({ input, measurements, thresholds, checks, passed }, null, 2)}\n`,
  );
  console.log(`输入： ${input}`);
  console.log(`整片响度： ${displayLevel(measurements.integratedLufs)} LUFS`);
  console.log(`LRA: ${displayLevel(measurements.loudnessRangeLu)} LU`);
  console.log(`真峰值： ${displayLevel(measurements.truePeakDbtp)} dBTP`);
  if (checks.integrated !== null) {
    console.log(
      `整片响度检查： ${checks.integrated ? "通过" : "未通过"} （目标 ${thresholds.targetLufs} LUFS ± ${thresholds.toleranceLu} LU）`,
    );
  }
  if (checks.truePeak !== null) {
    console.log(
      `真峰值检查： ${checks.truePeak ? "通过" : "未通过"} （上限 ${thresholds.maxTruePeakDbtp} dBTP）`,
    );
  }
  console.log(
    `结果： ${passed === null ? "仅报告" : passed ? "通过" : "未通过"}`,
  );
  console.log(path);
  if (passed === false) {
    console.error("出错：响度阈值检查未通过。");
    process.exitCode = 1;
  }
};

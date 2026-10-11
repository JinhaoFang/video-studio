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
import { spawnSync } from "node:child_process";
import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { basename, extname, join, resolve } from "node:path";

type Level = number | "-Infinity";

const runMedia = (program: "ffmpeg" | "ffprobe", args: string[]): string => {
  const result = spawnSync(program, args, {
    encoding: "utf8",
    maxBuffer: 4 * 1024 * 1024,
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
  return program === "ffprobe" ? result.stdout : result.stderr;
};

const readLevel = (value: unknown, name: string): Level => {
  if (value === "-inf") {
    return "-Infinity";
  }
  if (typeof value !== "string" || !Number.isFinite(Number(value))) {
    throw new Error(`ffmpeg returned an invalid ${name} measurement.`);
  }
  return Number(value);
};

const numericLevel = (value: Level): number =>
  value === "-Infinity" ? -Infinity : value;

const displayLevel = (value: Level): string =>
  typeof value === "number" ? value.toFixed(2) : value;

export const loudnessUsage =
  "pnpm qa loudness <file> [--target-lufs <value>] [--tolerance <LU>] [--max-true-peak <dBTP>] [--out <directory>]";

export const runLoudness = (args: string[]): void => {
  if (args.includes("--help")) {
    console.log(
      `${loudnessUsage}\n--target-lufs and --tolerance must be supplied together. No default thresholds.`,
    );
    return;
  }
  const options = new Map<string, string>();
  const positional: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg.startsWith("--")) {
      if (
        !["--target-lufs", "--tolerance", "--max-true-peak", "--out"].includes(
          arg,
        )
      ) {
        throw new Error(`Unknown option: ${arg}\nUsage: ${loudnessUsage}`);
      }
      const value = args[++index];
      if (options.has(arg) || !value || value.startsWith("--")) {
        throw new Error(`Provide ${arg} exactly once with a value.`);
      }
      options.set(arg, value);
    } else {
      positional.push(arg);
    }
  }
  if (positional.length !== 1) {
    throw new Error(`Provide exactly one input file.\nUsage: ${loudnessUsage}`);
  }
  if (options.has("--target-lufs") !== options.has("--tolerance")) {
    throw new Error("--target-lufs and --tolerance must be supplied together.");
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
      throw new Error(`${name} must be a finite number.`);
    }
    return Number(value);
  };
  const thresholds = {
    targetLufs: numericOption("--target-lufs"),
    toleranceLu: numericOption("--tolerance"),
    maxTruePeakDbtp: numericOption("--max-true-peak"),
  };
  if (thresholds.toleranceLu !== null && thresholds.toleranceLu < 0) {
    throw new Error("--tolerance must be nonnegative.");
  }
  const input = resolve(positional[0]);
  if (!statSync(input).isFile()) {
    throw new Error(`Not a media file: ${input}`);
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
    throw new Error(`No audio stream: ${input}`);
  }
  const output = runMedia("ffmpeg", [
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
  ]);
  const summaryIndex = output.lastIndexOf("Summary:");
  if (summaryIndex < 0) {
    throw new Error("ffmpeg did not return a loudness summary.");
  }
  const summary = output.slice(summaryIndex);
  const truePeakDbtp = readLevel(
    summary.match(/\bPeak:\s*(-inf|[-\d.]+)\s+dBFS/)?.[1],
    "True Peak",
  );
  const integratedLufs = readLevel(
    summary.match(/\bI:\s*(-inf|[-\d.]+)\s+LUFS/)?.[1],
    "Integrated",
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
  const directory = resolve(
    options.get("--out") ??
      join("out", "qa", "loudness", basename(input, extname(input))),
  );
  mkdirSync(directory, { recursive: true });
  const path = join(directory, "loudness.json");
  writeFileSync(
    path,
    `${JSON.stringify({ input, measurements, thresholds, checks, passed }, null, 2)}\n`,
  );
  console.log(`Input: ${input}`);
  console.log(`Integrated: ${displayLevel(measurements.integratedLufs)} LUFS`);
  console.log(`LRA: ${displayLevel(measurements.loudnessRangeLu)} LU`);
  console.log(`True Peak: ${displayLevel(measurements.truePeakDbtp)} dBTP`);
  if (checks.integrated !== null) {
    console.log(
      `Integrated check: ${checks.integrated ? "PASS" : "FAIL"} (target ${thresholds.targetLufs} LUFS +/- ${thresholds.toleranceLu} LU)`,
    );
  }
  if (checks.truePeak !== null) {
    console.log(
      `True Peak check: ${checks.truePeak ? "PASS" : "FAIL"} (maximum ${thresholds.maxTruePeakDbtp} dBTP)`,
    );
  }
  console.log(
    `Result: ${passed === null ? "REPORT ONLY" : passed ? "PASS" : "FAIL"}`,
  );
  console.log(path);
  if (passed === false) {
    process.exitCode = 1;
  }
};

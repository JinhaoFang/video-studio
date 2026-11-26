/** pnpm qa dropouts <媒体> 量第一条音轨的逐帧 RMS，输出断音摘要、JSON 和 SVG。默认只报告，显式给检测阈值时用退出码判定。 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { usageError } from "./cli.ts";
import { measureFrames, type LevelFrame } from "./qa-audio-levels.ts";
import { outputDirectory, parseOptions, positiveInteger } from "./qa-common.ts";
import { levelPlot, type Mark } from "./qa-dropouts-plot.ts";
import { formatTimecode } from "./qa-time.ts";

export const dropoutsUsage =
  "pnpm qa dropouts <文件> [--floor <dBFS>] [--min-duration <秒>] [--max-drop <dB>] [--ignore-head <秒>] [--ignore-tail <秒>] [--fps <纯音频帧率>] [--out <目录>]";
const defaults = {
  floor: -60,
  minDuration: 0.125,
  maxDrop: 20,
  quietDbfs: -45,
  ignoreHead: 0.25,
  ignoreTail: 0.25,
  fps: 24,
};
const timecode = (seconds: number) =>
  formatTimecode({
    numerator: BigInt(Math.round(seconds * 1e9)),
    denominator: 1_000_000_000n,
  });
const display = (n: number) =>
  Number.isFinite(n) ? n.toFixed(2) : n < 0 ? "−∞" : "+∞";

type Finding = Mark & {
  startSeconds: number;
  endSeconds: number;
  startTimecode: string;
  endTimecode: string;
  minDbfs: number;
  maxDbfs: number;
  previousDbfs?: number;
  dropDb?: number;
};

const analyze = (frames: LevelFrame[], settings: typeof defaults) => {
  const { floor, minDuration, maxDrop, quietDbfs, ignoreHead, ignoreTail } =
    settings;
  const first = frames.findIndex((f) => f.start >= ignoreHead);
  const scanEnd = frames.at(-1)!.end - ignoreTail;
  let last = frames.length - 1;
  while (last >= 0 && frames[last].end > scanEnd + 1e-9) last--;
  if (first < 0 || last < first)
    throw new Error(
      "排除片头片尾后没有完整帧可检查，请减小 --ignore-head 或 --ignore-tail。",
    );
  const findings: Finding[] = [];
  const finding = (
    type: Mark["type"],
    startFrame: number,
    endFrame: number,
  ): Finding => {
    const startSeconds = frames[startFrame].start,
      endSeconds = frames[endFrame].end;
    let minDbfs = frames[startFrame].dbfs,
      maxDbfs = minDbfs;
    for (let i = startFrame + 1; i <= endFrame; i++) {
      minDbfs = Math.min(minDbfs, frames[i].dbfs);
      maxDbfs = Math.max(maxDbfs, frames[i].dbfs);
    }
    return {
      type,
      startFrame,
      endFrame,
      startSeconds,
      endSeconds,
      startTimecode: timecode(startSeconds),
      endTimecode: timecode(endSeconds),
      minDbfs,
      maxDbfs,
    };
  };
  let lowStart = first;
  for (let i = first; i <= last; i++) {
    const { dbfs, end } = frames[i];
    if (i > first && dbfs <= quietDbfs && dbfs < frames[i - 1].dbfs) {
      const previousDbfs = frames[i - 1].dbfs,
        dropDb = previousDbfs - dbfs;
      if (dropDb > maxDrop)
        findings.push({ ...finding("drop", i, i), previousDbfs, dropDb });
    }
    if (dbfs >= floor) lowStart = i + 1;
    else if (
      (i === last || frames[i + 1].dbfs >= floor) &&
      end - frames[lowStart].start > minDuration + 1e-9
    )
      findings.push(finding("silence", lowStart, i));
  }
  findings.sort((a, b) => a.startFrame - b.startFrame);
  return { first, last, findings };
};

export const runDropouts = (args: string[]) => {
  const detectionOptions = ["--floor", "--min-duration", "--max-drop"];
  const { positional, options, help } = parseOptions(
    args,
    [...detectionOptions, "--ignore-head", "--ignore-tail", "--fps", "--out"],
    dropoutsUsage,
  );
  if (help) {
    console.log(`用法：${dropoutsUsage}
文件为视频或音频，分析第一条音轨。每帧取全部声道、全部采样的均方根（RMS），单位 dBFS。视频按实际呈现帧计，时间轴上缺音的采样按零计。
--fps 指定纯音频的分析帧率（正整数），默认 ${defaults.fps}。视频始终使用自身帧时间。
--floor 指定低电平下限，默认 ${defaults.floor} dBFS。连续帧严格低于该值才累计。
--min-duration 指定最短持续时间，默认 ${defaults.minDuration} 秒。持续时间超过该值才报告低电平段。
--max-drop 指定相邻帧最大降幅，默认 ${defaults.maxDrop} dB。降幅超过该值且落点 ≤ ${defaults.quietDbfs} dBFS 才报告骤降。
--ignore-head 和 --ignore-tail 指定片头、片尾排除秒数，默认各 ${defaults.ignoreHead} 秒。只检查完全落在剩余区间内的帧，骤降两帧都须在区间内。排除后须至少留一帧。
--out 指定输出目录，默认 out/qa/dropouts/<文件名>，写入 dropouts.json 和 levels.svg。
帧号从 0 开始，起止帧均包含。骤降帧号指落点。时间码为 分:秒.毫秒，结束时间指末帧结束边界。数字静音在 JSON 中记为 "-Infinity"。
只给文件或调整排除区、帧率、目录时仅报告，退出 0。显式给出任一检测阈值时按全部有效阈值判定，有问题退出 1，通过退出 0。参数或运行错误退出 2。--help 显示本帮助并退出 0。`);
    return;
  }
  if (positional.length !== 1)
    throw usageError("请提供一个输入文件。", dropoutsUsage);
  const numeric = (name: string, fallback: number) => {
    const raw = options.get(name);
    if (raw === undefined) return fallback;
    const value = Number(raw);
    if (
      !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(raw) ||
      !Number.isFinite(value) ||
      (name === "--floor" ? value > 0 : value < 0)
    )
      throw usageError(
        `${name} 必须是有限${name === "--floor" ? "非正" : "非负"}数。`,
        dropoutsUsage,
      );
    return value;
  };
  const settings = {
    ...defaults,
    floor: numeric("--floor", defaults.floor),
    minDuration: numeric("--min-duration", defaults.minDuration),
    maxDrop: numeric("--max-drop", defaults.maxDrop),
    ignoreHead: numeric("--ignore-head", defaults.ignoreHead),
    ignoreTail: numeric("--ignore-tail", defaults.ignoreTail),
    fps: positiveInteger(options.get("--fps") ?? String(defaults.fps), "--fps"),
  };
  const input = resolve(positional[0]);
  const { frames, sampleRate, channels, audioFps } = measureFrames(
    input,
    settings.fps,
  );
  const { first, last, findings } = analyze(frames, settings);
  const minimum = (from: number, to: number) => {
    let frame = from;
    for (let i = from + 1; i <= to; i++)
      if (frames[i].dbfs < frames[frame].dbfs) frame = i;
    return {
      frame,
      timecode: timecode(frames[frame].start),
      dbfs: frames[frame].dbfs,
    };
  };
  const minimumFrame = minimum(0, frames.length - 1),
    checkedMinimum = minimum(first, last);
  const gated = detectionOptions.some((name) => options.has(name));
  const passed = gated ? findings.length === 0 : null;
  const report = {
    input,
    sampleRate,
    channels,
    audioFps,
    frameCount: frames.length,
    durationSeconds: frames.at(-1)!.end,
    thresholds: {
      floorDbfs: settings.floor,
      minDuration: settings.minDuration,
      maxDropDb: settings.maxDrop,
      quietDbfs: settings.quietDbfs,
    },
    ignoreHead: settings.ignoreHead,
    ignoreTail: settings.ignoreTail,
    checkedFrames: { first, last },
    minimumFrame,
    checkedMinimum,
    findings,
    passed,
  };
  const directory = outputDirectory("dropouts", input, options.get("--out"));
  mkdirSync(directory, { recursive: true });
  const json = join(directory, "dropouts.json"),
    svg = join(directory, "levels.svg");
  writeFileSync(svg, levelPlot(frames, findings, first, last, settings.floor));
  writeFileSync(
    json,
    `${JSON.stringify(report, (_key, v) => (typeof v === "number" && !Number.isFinite(v) ? String(v) : v), 2)}\n`,
  );
  const lowCount = findings.filter((f) => f.type === "silence").length;
  console.log(
    `已检查 F${first}–F${last}（共 ${frames.length} 帧）。全片最低 F${minimumFrame.frame} ${display(minimumFrame.dbfs)} dBFS，检查区最低 F${checkedMinimum.frame} ${display(checkedMinimum.dbfs)} dBFS。`,
  );
  console.log(
    `低电平段 ${lowCount} 处，单帧骤降 ${findings.length - lowCount} 处。`,
  );
  console.log(
    `结果：${passed === null ? "仅报告" : passed ? "通过" : "未通过"}\n${svg}\n${json}`,
  );
  if (passed === false) {
    console.error("出错：断音阈值检查未通过。");
    process.exitCode = 1;
  }
};

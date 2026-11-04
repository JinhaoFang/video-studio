/**
 * Rebuild episode-local music, clock ticks and the final mix from a timeline.
 * Run `node tools/mix-opening.ts --help`; all media stays in the explicit output
 * directory. Tokens are loaded from the caller's file so concurrent #67 clock
 * work can be consumed read-only before integration. Clock timing mirrors
 * Shot1974Proposal: L008 + chapter dissolve + dissolve, then scrambleFrames.
 * Voices use the same frame starts and exclusive ends as Remotion Audio.
 * Optional video muxing replaces every source audio stream and checks duration.
 * TODO(design): confirm the conservative 80 Hz bed, 20 dB RMS separation and
 * 2.3 kHz Hann-window ticks; this ticket deliberately avoids timbre refinement.
 */
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { isAbsolute, join, relative, resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { parseOptions, runMedia } from "./qa-common.ts";
import { sentencePoint } from "./qa-sentence.ts";
import { reportError, usageError } from "./cli.ts";
import type { Timeline } from "./timeline-types.ts";

const usage =
  "node tools/mix-opening.ts <时间轴.json> --tokens <风格令牌.ts> --out <目录> [--public-root <素材根目录>] [--video <已渲染视频>]";
const sampleRate = 48000;
const musicHz = 80;
const tickHz = 2300;
const musicBelowVoiceDb = 20;
const hash = (path: string): string =>
  createHash("sha256").update(readFileSync(path)).digest("hex");
const rms = (samples: Float32Array): number =>
  Math.sqrt(
    samples.reduce((sum, value) => sum + value * value, 0) / samples.length,
  );
const db = (amplitude: number): number => 20 * Math.log10(amplitude);

const writeWave = (path: string, samples: Float32Array): void => {
  const wave = Buffer.alloc(44 + samples.length * 4);
  wave.write("RIFF");
  wave.writeUInt32LE(wave.length - 8, 4);
  wave.write("WAVEfmt ", 8);
  wave.writeUInt32LE(16, 16);
  wave.writeUInt16LE(3, 20);
  wave.writeUInt16LE(1, 22);
  wave.writeUInt32LE(sampleRate, 24);
  wave.writeUInt32LE(sampleRate * 4, 28);
  wave.writeUInt16LE(4, 32);
  wave.writeUInt16LE(32, 34);
  wave.write("data", 36);
  wave.writeUInt32LE(samples.length * 4, 40);
  samples.forEach((value, index) => wave.writeFloatLE(value, 44 + index * 4));
  writeFileSync(path, wave);
};

const main = async (): Promise<void> => {
  const { positional, options, help } = parseOptions(
    process.argv.slice(2),
    ["--tokens", "--out", "--public-root", "--video"],
    usage,
  );
  if (help) {
    console.log(
      `用法：${usage}\n生成旁白、80 Hz 铺底、2300 Hz 嘀嗒和 -16 LUFS 混音；可重复覆盖输出。\n--tokens 必须包含 motion 与 proposal.clock；#67 合并前可传入它的只读 worktree 路径。\n--video 复制视频码流并替换为混音，输出 opening-mixed.mp4；视频帧率、帧数须与时间轴一致。\n退出码：0 完成；1 混音阈值未通过；2 参数或运行出错。`,
    );
    return;
  }
  if (
    positional.length !== 1 ||
    !options.has("--tokens") ||
    !options.has("--out")
  )
    throw usageError("请提供时间轴、风格令牌和输出目录。", usage);
  const timelinePath = resolve(positional[0]);
  const tokenPath = resolve(options.get("--tokens")!);
  const publicRoot = resolve(options.get("--public-root") ?? "public");
  const directory = resolve(options.get("--out")!);
  const timeline = JSON.parse(readFileSync(timelinePath, "utf8")) as Timeline;
  const l008 = sentencePoint(timeline, "L008").frame;
  const l009 = sentencePoint(timeline, "L009").frame;
  const l010 = sentencePoint(timeline, "L010").frame;
  if (timeline.source.kind === "temporary")
    throw new Error("混音需要正式配音时间轴，不能使用含原片配乐的临时音轨。");
  const tokens = await import(pathToFileURL(tokenPath).href);
  const motion = tokens.motion;
  const clock = tokens.proposal?.clock;
  const parameters = {
    chapterDissolveFrames: motion?.chapterDissolveFrames,
    dissolveFrames: motion?.dissolveFrames,
    scrambleFrames: clock?.scrambleFrames,
    stepFrames: clock?.stepFrames,
    stopStaggerFrames: clock?.stopStaggerFrames,
  };
  if (
    Object.values(parameters).some(
      (value) => !Number.isSafeInteger(value) || value <= 0,
    ) ||
    clock.scrambleFrames <= 3 * clock.stopStaggerFrames
  )
    throw new Error("令牌缺少有效的 motion / proposal.clock 整数帧参数。");
  const startFrame =
    l008 + motion.chapterDissolveFrames + motion.dissolveFrames;
  const endFrame = startFrame + clock.scrambleFrames;
  if (startFrame >= l009 || endFrame <= l009 || endFrame > l010)
    throw new Error(
      "翻牌钟乱跳区间必须覆盖 L008～L009，并在 L010 前结束，请核对镜头。",
    );
  const frameSample = (frame: number) =>
    Math.round((frame * sampleRate) / timeline.fps);
  const sampleCount = frameSample(timeline.durationInFrames);
  const voice = new Float32Array(sampleCount);
  const music = new Float32Array(sampleCount);
  const ticks = new Float32Array(sampleCount);
  const inputs = timeline.lines.map((line) => {
    if (!line.audioSrc || isAbsolute(line.audioSrc))
      throw new Error(`${line.id} 缺少 public 相对音频路径。`);
    const path = resolve(publicRoot, line.audioSrc);
    const inside = relative(publicRoot, path);
    if (
      inside === ".." ||
      inside.startsWith(`..${sep}`) ||
      !statSync(path).isFile()
    )
      throw new Error(`${line.id} 的音频必须是素材根目录内的文件。`);
    return { line, path, sha256: hash(path) };
  });
  const videoPath = options.has("--video")
    ? resolve(options.get("--video")!)
    : null;
  if (videoPath) {
    const probe = JSON.parse(
      runMedia("ffprobe", [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "stream=nb_frames,r_frame_rate",
        "-of",
        "json",
        videoPath,
      ]),
    );
    const stream = probe.streams?.[0];
    const rate = stream?.r_frame_rate?.split("/").map(Number);
    if (
      !rate ||
      rate[0] / rate[1] !== timeline.fps ||
      Number(stream.nb_frames) !== timeline.durationInFrames
    )
      throw new Error("视频帧率或帧数与时间轴不一致，请按当前时间轴重新渲染。");
    if (resolve(directory, "opening-mixed.mp4") === videoPath)
      throw new Error("输出视频不能覆盖输入视频。");
  }
  mkdirSync(directory, { recursive: true });
  const commands: { program: string; args: string[] }[] = [];
  const run = (
    program: "ffmpeg" | "ffprobe",
    args: string[],
    output: "stdout" | "stderr" = "stdout",
  ) => {
    commands.push({ program, args });
    writeFileSync(
      join(directory, "commands.json"),
      `${JSON.stringify(commands, null, 2)}\n`,
    );
    const result = spawnSync(program, args, {
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    const log = join(directory, `command-${commands.length}.log`);
    writeFileSync(log, result.stderr ?? "");
    if (result.error) throw result.error;
    if (result.status !== 0)
      throw new Error(
        `${program} 运行失败（退出码 ${result.status}），日志：${log}`,
      );
    return result[output];
  };
  const base = ["-hide_banner", "-nostdin", "-y"];
  const decodedPath = join(directory, "decoded-voice.f32");
  for (const { line, path } of inputs) {
    run("ffmpeg", [
      ...base,
      "-i",
      path,
      "-map",
      "0:a:0",
      "-ac",
      "1",
      "-ar",
      String(sampleRate),
      "-c:a",
      "pcm_f32le",
      "-f",
      "f32le",
      decodedPath,
    ]);
    const decoded = readFileSync(decodedPath);
    const start = frameSample(line.startFrame);
    const count = Math.min(
      decoded.length / 4,
      frameSample(line.endFrame) - start,
    );
    for (let index = 0; index < count; index++)
      voice[start + index] = decoded.readFloatLE(index * 4);
  }
  const voiceRms = rms(voice);
  if (!Number.isFinite(voiceRms) || voiceRms <= 0)
    throw new Error("正式旁白为空或包含无效采样。");
  const musicRms = voiceRms * 10 ** (-musicBelowVoiceDb / 20);
  for (let index = 0; index < sampleCount; index++)
    music[index] =
      Math.SQRT2 *
      musicRms *
      Math.sin((2 * Math.PI * musicHz * index) / sampleRate);
  const events: { frame: number; endFrame: number; activeColumns: number }[] =
    [];
  for (let frame = startFrame; frame < endFrame; frame += clock.stepFrames) {
    const activeColumns = [0, 1, 2, 3].filter(
      (index) => frame < endFrame - (3 - index) * clock.stopStaggerFrames,
    ).length;
    const stop = Math.min(frame + clock.stepFrames, endFrame);
    const start = frameSample(frame);
    const count = frameSample(stop) - start;
    for (let index = 0; index < count; index++) {
      const envelope = (1 - Math.cos((2 * Math.PI * index) / (count - 1))) / 2;
      ticks[start + index] =
        voiceRms *
        (activeColumns / 4) *
        envelope *
        Math.sin((2 * Math.PI * tickHz * index) / sampleRate);
    }
    events.push({ frame, endFrame: stop, activeColumns });
  }
  for (const [name, samples] of [
    ["voice", voice],
    ["music", music],
    ["ticks", ticks],
  ] as const)
    writeWave(join(directory, `${name}.wav`), samples);
  const rawPath = join(directory, "mix-raw.wav");
  run("ffmpeg", [
    ...base,
    "-i",
    join(directory, "voice.wav"),
    "-i",
    join(directory, "music.wav"),
    "-i",
    join(directory, "ticks.wav"),
    "-filter_complex",
    "[0:a][1:a][2:a]amix=inputs=3:normalize=0,pan=stereo|c0=c0|c1=c0[mix]",
    "-map",
    "[mix]",
    "-c:a",
    "pcm_f32le",
    rawPath,
  ]);
  const target = "loudnorm=I=-16:TP=-2:LRA=20";
  const measurement = run(
    "ffmpeg",
    [
      ...base,
      "-i",
      rawPath,
      "-af",
      `${target}:print_format=json`,
      "-f",
      "null",
      "-",
    ],
    "stderr",
  );
  writeFileSync(join(directory, "normalization-pass1.log"), measurement);
  const stats = JSON.parse(measurement.slice(measurement.lastIndexOf("{")));
  const filter = `${target}:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true:print_format=json`;
  const mixedPath = join(directory, "mix.wav");
  const normalization = run(
    "ffmpeg",
    [
      ...base,
      "-i",
      rawPath,
      "-af",
      filter,
      "-ar",
      String(sampleRate),
      "-c:a",
      "pcm_s24le",
      mixedPath,
    ],
    "stderr",
  );
  writeFileSync(join(directory, "normalization-pass2.log"), normalization);
  const finalStats = JSON.parse(
    normalization.slice(normalization.lastIndexOf("{")),
  );
  if (videoPath)
    run("ffmpeg", [
      ...base,
      "-i",
      videoPath,
      "-i",
      mixedPath,
      "-map",
      "0:v:0",
      "-map",
      "1:a:0",
      "-c:v",
      "copy",
      "-c:a",
      "aac",
      "-b:a",
      "320k",
      "-ar",
      String(sampleRate),
      "-t",
      String(timeline.durationInFrames / timeline.fps),
      "-movflags",
      "+faststart",
      join(directory, "opening-mixed.mp4"),
    ]);
  const report = {
    timeline: {
      path: timelinePath,
      sha256: hash(timelinePath),
      fps: timeline.fps,
      durationInFrames: timeline.durationInFrames,
    },
    tokens: { path: tokenPath, sha256: hash(tokenPath), parameters },
    clock: {
      anchor: "L008 + motion.chapterDissolveFrames + motion.dissolveFrames",
      sentenceFrames: { L008: l008, L009: l009, L010: l010 },
      startFrame,
      endFrame,
      startSeconds: startFrame / timeline.fps,
      endSeconds: endFrame / timeline.fps,
      columnStopFrames: [0, 1, 2, 3].map(
        (index) => endFrame - (3 - index) * clock.stopStaggerFrames,
      ),
      events,
    },
    synthesis: {
      sampleRate,
      sampleCount,
      musicHz,
      tickHz,
      tickEnvelope:
        "Hann over clock.stepFrames; amplitude proportional to active columns",
    },
    levels: {
      scope: "whole-duration mono stems, before shared loudness normalization",
      voiceRmsDbfs: db(voiceRms),
      musicRmsDbfs: db(rms(music)),
      musicBelowVoiceDb: db(voiceRms / rms(music)),
      tickRmsDbfs: db(rms(ticks)),
    },
    normalization: {
      targetLufs: -16,
      truePeakCeilingDbtp: -2,
      lraPolicy: "report only",
      measured: stats,
      result: finalStats,
    },
    inputs: inputs.map(({ line, path, sha256 }) => ({
      id: line.id,
      path,
      sha256,
      startFrame: line.startFrame,
      endFrame: line.endFrame,
    })),
    output: {
      mix: mixedPath,
      mixSha256: hash(mixedPath),
      video: videoPath ? join(directory, "opening-mixed.mp4") : null,
    },
    commands,
  };
  writeFileSync(
    join(directory, "mix-report.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
  console.log(`混音：${mixedPath}`);
  console.log(
    `配乐比旁白低 ${report.levels.musicBelowVoiceDb.toFixed(2)} dB（全长 RMS，共同归一化前）。`,
  );
  console.log(
    `嘀嗒：第 ${startFrame}～${endFrame} 帧（末帧不含），${events.length} 次。`,
  );
  console.log(
    `混音响度：${finalStats.output_i} LUFS；真峰值：${finalStats.output_tp} dBTP；LRA：${finalStats.output_lra} LU。`,
  );
  if (
    Math.abs(Number(finalStats.output_i) + 16) > 1 ||
    Number(finalStats.output_tp) > -1
  ) {
    console.error("出错：混音阈值检查未通过，请查看归一化报告。");
    process.exitCode = 1;
  }
};

try {
  await main();
} catch (error) {
  reportError(error);
}

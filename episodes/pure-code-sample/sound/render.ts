/** 独立声音入口：node episodes/pure-code-sample/sound/render.ts --events <事件表> --out <目录>；生成器按 A/B 全片事件表调用，默认读取 A 版。 */
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { reportError } from "../../../tools/cli.ts";
import { hottest100ms, pcmWav, rate, seedFor } from "./dsp.ts";
import {
  levels,
  master,
  measure,
  MeasurementFailure,
  pitchReport,
  spectrum,
} from "./measure.ts";
import { renderMix } from "./mix.ts";
import { synthesizeSfx } from "./sfx.ts";
import type { EventTable, Score, SfxName, SoundDesign } from "./types.ts";

const usage =
  "node episodes/pure-code-sample/sound/render.ts [--events <事件表>] [--out <目录>] [--seed <整数>] [--help]";
const root = resolve(import.meta.dirname, "../../..");
const episode = join(root, "episodes/pure-code-sample");
const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, "utf8"));
const hash = (data: string | Uint8Array) =>
  createHash("sha256").update(data).digest("hex");
try {
  const { values } = parseArgs({
    options: {
      events: { type: "string" },
      out: { type: "string" },
      seed: { type: "string" },
      help: { type: "boolean" },
    },
  });
  if (values.help) {
    console.log(
      `用法：${usage}\n默认读取本期 data/events-a.json；输出到 out/qa/spec-147/158。默认种子 158。\n生成 48 kHz PCM16 分轨、混音、音效库、乐器干轨、频谱图及测量报告；不写 public，不接合成。\n事件/乐句不合规以 2 退出；验收不通过以 1 退出；成功或帮助以 0 退出。`,
    );
  } else {
    const seedText = values.seed ?? "158";
    if (
      !/^\d+$/.test(seedText) ||
      !Number.isSafeInteger(Number(seedText)) ||
      Number(seedText) > 0xffffffff
    )
      throw new Error(`种子必须是 0–4294967295 的整数。\n用法：${usage}`);
    const seed = Number(seedText);
    const eventsPath = values.events
      ? resolve(values.events)
      : join(episode, "data/events-a.json");
    const directory = values.out
      ? resolve(values.out)
      : join(root, "out/qa/spec-147/158");
    const table = readJson<EventTable>(eventsPath);
    const score = readJson<Score>(join(episode, "score.json"));
    const design = readJson<SoundDesign>(join(episode, "sound.json"));
    const start = performance.now();
    const rendered = renderMix(table, score, design, seed);
    const mastered = master(
      rendered.mix,
      rendered.stems,
      design.master.integratedLufs,
      design.master.maxTruePeakDbtp,
      design.master.toleranceLu,
    );
    mkdirSync(directory, { recursive: true });
    const files: {
      path: string;
      sha256: string;
      bytes: number;
      levels?: ReturnType<typeof levels>;
      loudness?: ReturnType<typeof measure>;
    }[] = [];
    const save = (name: string, data: string | Uint8Array) => {
      const path = join(directory, name);
      mkdirSync(resolve(path, ".."), { recursive: true });
      writeFileSync(path, data);
      files.push({
        path: name,
        sha256: hash(data),
        bytes:
          typeof data === "string"
            ? new TextEncoder().encode(data).length
            : data.length,
      });
      return path;
    };
    const saveAudio = (
      name: string,
      channels: readonly Float64Array[],
      loudness: boolean,
    ) => {
      const path = save(name, pcmWav(channels));
      const row = files[files.length - 1];
      row.levels = levels(channels);
      if (loudness) row.loudness = measure(channels);
      const image = join(
        directory,
        "spectra",
        name.replaceAll("/", "-").replace(/\.wav$/, ".png"),
      );
      mkdirSync(resolve(image, ".."), { recursive: true });
      spectrum(path, image);
      files.push({
        path: relative(directory, image),
        sha256: hash(readFileSync(image)),
        bytes: readFileSync(image).length,
      });
    };
    saveAudio("mix.wav", mastered.output, true);
    for (const [name, bus] of Object.entries(rendered.stems))
      saveAudio(`${name}.wav`, bus, true);
    for (const [name, bus] of Object.entries(rendered.instruments))
      saveAudio(`instruments/${name}.wav`, bus, true);
    const library = {} as Record<
      SfxName,
      {
        alignmentSample: number;
        alignmentSeconds: number;
        hottest100msLufs: number;
        peakDbfs: number;
      }
    >;
    for (const name of Object.keys(design.sfx) as SfxName[]) {
      const clip = synthesizeSfx(name, seedFor(seed, `library/${name}`));
      const level = levels([clip.samples]);
      library[name] = {
        alignmentSample: clip.alignmentSample,
        alignmentSeconds: clip.alignmentSample / rate,
        hottest100msLufs: hottest100ms(clip.samples),
        peakDbfs: level.peakDbfs,
      };
      saveAudio(`sfx/${name}.wav`, [clip.samples], false);
    }
    const pitches = pitchReport(rendered.voices);
    save("pitch.json", JSON.stringify(pitches, null, 2) + "\n");
    save(
      "placements.json",
      JSON.stringify(rendered.placements, null, 2) + "\n",
    );
    const command = [
      "node",
      "episodes/pure-code-sample/sound/render.ts",
      "--events",
      relative(root, eventsPath),
      "--out",
      relative(root, directory),
      "--seed",
      String(seed),
    ];
    const sourceFiles = [
      "score.json",
      "sound.json",
      "model.ts",
      ...["types", "dsp", "score", "sfx", "mix", "measure", "render"].map(
        (name) => `sound/${name}.ts`,
      ),
    ];
    const report = {
      command,
      runtime: {
        node: process.version,
        ffmpeg: execFileSync("ffmpeg", ["-version"], {
          encoding: "utf8",
        }).split("\n")[0],
      },
      seed,
      fps: table.fps,
      sampleRate: rate,
      durationFrames: rendered.durationFrames,
      durationSeconds: rendered.durationFrames / table.fps,
      inputs: [
        eventsPath,
        join(root, "tools/cli.ts"),
        ...sourceFiles.map((name) => join(episode, name)),
      ].map((path) => ({
        path: relative(root, path),
        sha256: hash(readFileSync(path)),
      })),
      master: {
        before: mastered.before,
        after: mastered.after,
        gainDb: mastered.gainDb,
        maximumReductionDb: mastered.maximumReductionDb,
        limiterCeilingDbfs: mastered.limiterCeilingDbfs,
      },
      referenceMethod:
        "48 kHz BS.1770 K 加权单声道，逐采样滑动 100 ms 窗的最大均方值，-0.691 校准，不加门限；这不是 EBU R128 的 400 ms momentary。参考峰值超过 -1.5 dBFS 时静态 tanh 压峰后重新归一，无时间位移。",
      sfxLibrary: library,
      pitch: { method: pitches.method, instruments: pitches.instruments },
      silences: design.silences,
      ducking: design.ducking,
      files,
      synthesisAndQaSeconds: (performance.now() - start) / 1000,
    };
    save("measurements.json", JSON.stringify(report, null, 2) + "\n");
    const rows = Object.entries(pitches.instruments)
      .map(
        ([name, data]) =>
          `| ${name} | ${data.count} | ${data.medianAbsoluteCents.toFixed(3)} | ${data.p90AbsoluteCents.toFixed(3)} | ${data.pitches.join(", ")} |`,
      )
      .join("\n");
    const levelRows = files
      .filter((file) => file.levels)
      .map(
        (file) =>
          `| ${file.path} | ${file.levels!.peakDbfs.toFixed(2)} | ${file.levels!.rmsDbfs.toFixed(2)} | ${file.loudness?.integratedLufs ?? "参考库见 JSON"} |`,
      )
      .join("\n");
    save(
      "measurements.md",
      `# #158 声音测量\n\n命令参数数组：\`${JSON.stringify(command)}\`\n\n事件表：\`${eventsPath}\`。${rendered.durationFrames} 帧、${rendered.durationFrames / table.fps} 秒、48 kHz PCM16。\n\n混音：${mastered.after.integratedLufs.toFixed(1)} LUFS，${mastered.after.truePeakDbtp.toFixed(1)} dBTP；总线增益 ${mastered.gainDb.toFixed(2)} dB，最大限幅 ${mastered.maximumReductionDb.toFixed(2)} dB。离线预读 5 ms、释放 80 ms，所有分轨共享同一增益包络，采样不移动。PCM16 分轨相加与混音可能相差最多数个量化单位。\n\n## 音高\n\n${pitches.method}\n\n| 乐器 | 音符数 | 绝对误差中位数（音分） | 90 分位（音分） | 测量音符 |\n|---|---:|---:|---:|---|\n${rows}\n\n逐音原始测量见 pitch.json；这是精度报告，乐谱没有规定音分合格线。\n\n## 各轨电平\n\n| 轨道 | 采样峰值 dBFS | 全长每声道 RMS dBFS | LUFS |\n|---|---:|---:|---:|\n${levelRows}\n\n## 参考库与落位\n\n十四种音效的对齐点、最响 100 ms K 加权参考电平和峰值见 measurements.json 的 sfxLibrary；定义：${report.referenceMethod}\n\nplacements.json 逐项记录事件帧、内部对齐采样、起点、声像、变体电平与混响比例。频谱图位于 spectra/，横轴时间，纵轴对数频率，颜色为对数幅度。检查图字体只用于验收，不进入成片。\n\n## 边界和待试听\n\n事件表由命令的 --events 指定；生成器传入对应版本的真实全片事件，开发夹具仅供独立验收。静默仅执行 sound.json 明列的 mute/duck；未额外静音其他音效尾声。毡锤钢琴按乐句延音，乐句末 40 ms 抬踏板；有截止约束的乐器含混响在截止帧前用 150 ms 斜坡退完。刮奏各音均匀分布于 F 大调音阶，以 1/√音符数 分配手势能量，保留到乐句末的自然衰减；look 按 JSON 的 72 BPM 执行。puff 的竖琴不设截止，余音和混响自然接进 look；静默只停滴水、压低暮蝉，不静音配乐；garden_air 底噪全片不断，总线任何时刻不掉到数字静音；静默边界外有 5 ms 防点击斜坡。床音的区间与淡入淡出作用于含混响的整条声音。声音数据未给出的模态、包络、湿度和激励参数为保守合成近似，真实感仍须设计负责人/用户试听。\n`,
    );
    console.log(
      `声音生成完成：${directory}\n混音 ${mastered.after.integratedLufs.toFixed(1)} LUFS，真峰值 ${mastered.after.truePeakDbtp.toFixed(1)} dBTP。\n${rendered.voices.length} 颗音符、${rendered.placements.length} 次音效落位；${files.length} 个验收文件；耗时 ${((performance.now() - start) / 1000).toFixed(1)} 秒。`,
    );
  }
} catch (error) {
  reportError(error);
  if (error instanceof MeasurementFailure) process.exitCode = 1;
}

/**
 * 《雨后》全片装配预演（#185）临时声音渲染入口：
 * 运行 `node episodes/after-rain/sound/render.ts [--events <事件表>] [--out <目录>] [--seed <整数>] [--help]`。
 * 绕开 src/kit/sound/mix.ts 的 validateEvents 不支持叠化重叠镜头表的限制，直接调用 kit 的 compileScore、synthesizeVoice、synthesizeChirp、reverb 与 master，
 * 生成 48 kHz 双声道临时混音（-16 LUFS ±1 LU，真峰值 <= -1 dBTP，全程底噪不断、无数字静音断音）。
 * 退出码：0 通过/帮助，1 响度验收不通过，2 参数或运行出错。
 * 待定事项：正式声音与混音由 #193 替换。
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { filmDuration, frameToSample } from "../../../src/kit/shots.ts";
import {
  add,
  curve,
  dbGain,
  pcmWav,
  place,
  rate,
  reverb,
  seedFor,
  stereo,
} from "../../../src/kit/sound/dsp.ts";
import {
  levels,
  master,
  measure,
  MeasurementFailure,
} from "../../../src/kit/sound/measure.ts";
import { compileScore, resolveAnchor } from "../../../src/kit/sound/score.ts";
import type { EventTable, Scene, Score, Stereo } from "../../../src/kit/sound/types.ts";
import { reportError, usageError } from "../../../tools/cli.ts";
import { shotRow } from "../model.ts";
import {
  synthesizeHumClip,
  synthesizeTempSfx,
  type TempSfxName,
} from "./sfx.ts";

const usage =
  "node episodes/after-rain/sound/render.ts [--events <事件表>] [--out <目录>] [--seed <整数>] [--help]";
const root = resolve(import.meta.dirname, "../../..");
const episode = join(root, "episodes/after-rain");

const scenes: Record<"eaves" | "garden" | "open" | "music", Scene> = {
  eaves: {
    t60: 0.32,
    preDelayMs: 2,
    earlyReflectionsMs: [2.5, 4.2, 6.5],
    highCutHz: 5800,
  },
  garden: {
    t60: 0.85,
    preDelayMs: 26,
    earlyReflectionsMs: [40, 74, 115],
    highCutHz: 4400,
  },
  open: {
    t60: 0.45,
    preDelayMs: 36,
    earlyReflectionsMs: [60],
    highCutHz: 3800,
  },
  music: {
    t60: 1.6,
    preDelayMs: 20,
    highCutHz: 9000,
  },
};

type EventMapping = {
  sfx: TempSfxName;
  db: number;
  pan: number;
  scene: "eaves" | "garden" | "open";
  hero?: boolean;
};

const eventSfxMap: Record<string, EventMapping | undefined> = {
  thunder: { sfx: "thunder", db: -12, pan: 0, scene: "garden" },
  companion_call: { sfx: "companion_call", db: -24, pan: 0.6, scene: "garden" },
  call_weak: { sfx: "call_weak", db: -16, pan: 0.25, scene: "eaves" },
  claw_shift: { sfx: "claw_shift", db: -20, pan: 0.2, scene: "eaves" },
  wing_lift: { sfx: "feather_flinch", db: -20, pan: 0.2, scene: "eaves" },
  shiver: { sfx: "feather_shake", db: -15, pan: 0.2, scene: "eaves" },
  drip_hit: { sfx: "drip_hit", db: -4, pan: 0.24, scene: "eaves", hero: true },
  mud_step: { sfx: "mud_step", db: -13, pan: -0.1, scene: "garden" },
  mud_pull: { sfx: "mud_pull", db: -18, pan: -0.1, scene: "garden" },
  basket_creak: { sfx: "basket_creak", db: -20, pan: 0.1, scene: "garden" },
  puddle_step: { sfx: "puddle_step", db: -8, pan: 0.12, scene: "garden", hero: true },
  splash_peak: { sfx: "splash_peak", db: -6, pan: 0.15, scene: "garden", hero: true },
  flinch: { sfx: "feather_flinch", db: -16, pan: 0.1, scene: "eaves" },
  call_alarm: { sfx: "call_alarm", db: -6, pan: 0.12, scene: "eaves", hero: true },
  windup: { sfx: "pole_creak", db: -20, pan: 0.1, scene: "eaves" },
  push_off: { sfx: "takeoff_push", db: -12, pan: 0.1, scene: "eaves" },
  flap_wet: { sfx: "wing_flap", db: -12, pan: 0.12, scene: "eaves" },
  fall_back: { sfx: "fall_thud", db: -6, pan: 0.1, scene: "eaves", hero: true },
  pole_spring: { sfx: "pole_spring", db: -6, pan: 0.05, scene: "eaves", hero: true },
  call_small: { sfx: "call_small", db: -17, pan: 0.12, scene: "eaves" },
  drop_land: { sfx: "drip_land", db: -20, pan: 0, scene: "garden" },
  step_stop: { sfx: "step_stop", db: -13, pan: 0, scene: "garden" },
  toe_turn: { sfx: "toe_turn", db: -18, pan: 0.15, scene: "garden" },
  shake: { sfx: "feather_shake", db: -11, pan: 0.12, scene: "eaves" },
  puff: { sfx: "feather_puff", db: -13, pan: 0.12, scene: "eaves" },
  call_clear: { sfx: "call_clear", db: -10, pan: 0.05, scene: "eaves" },
  crouch: { sfx: "pole_creak", db: -19, pan: 0, scene: "eaves" },
  takeoff: { sfx: "takeoff_push", db: -9, pan: 0, scene: "eaves", hero: true },
  wingbeat: { sfx: "wing_flap", db: -16, pan: 0.2, scene: "open" },
  wing_pass: { sfx: "wing_pass", db: -6, pan: 0.25, scene: "eaves", hero: true },
  land: { sfx: "claw_shift", db: -16, pan: 0.35, scene: "open", hero: true },
  flock_shift: { sfx: "claw_shift", db: -24, pan: 0.35, scene: "open" },
  call_home: { sfx: "call_home", db: -14, pan: 0.35, scene: "open" },
  title_dot: { sfx: "drip_land", db: -18, pan: -0.25, scene: "garden" },
  seal_press: { sfx: "seal_press", db: -14, pan: -0.25, scene: "garden" },
};

const hash = (data: string | Uint8Array) =>
  createHash("sha256").update(data).digest("hex");

export const ambienceTiming = (table: EventTable) => {
  const start = (id: string) => shotRow(table.shotTable, id).startFrame;
  const end = (id: string) => {
    const row = shotRow(table.shotTable, id);
    return row.startFrame + row.durationInFrames;
  };
  const bed = (from: number, to: number, density?: [number, number][]) => ({ from, to, density });
  const durationFrames = filmDuration(table.shotTable);
  const open = resolveAnchor({ event: "open" }, table);
  const rainTail = resolveAnchor({ event: "rain_tail" }, table);
  const hush = { from: start("s08"), to: end("s08") };
  const beds = {
    garden_air: bed(start("s01"), durationFrames),
    heavy_rain: bed(open, rainTail + 6, [[open, 1.5], [start("s02"), 1.35], [rainTail, 0.95]]),
    rain_tail: bed(rainTail, rainTail + 108),
    eave_drips: bed(start("s03"), hush.to, [
      [start("s03"), 1.0], [start("s04"), 0.45], [hush.from, 0.18], [hush.to, 0.12],
    ]),
    higurashi: bed(start("s03") + 72, durationFrames),
    paddy_wind: bed(start("s04"), durationFrames, [
      [start("s04"), 0.4], [hush.from, 0.35], [start("s11"), 1.1], [end("s11"), 0.45], [durationFrames, 0.35],
    ]),
  };
  return { durationFrames, beds, hush };
};

const renderTempMix = (table: EventTable, rawScore: Score & { phrases: { id: string; notes: { instrument: string }[] }[] }, seed: number) => {
  const { durationFrames, beds, hush } = ambienceTiming(table);
  const count = frameToSample(durationFrames, rate, table.fps);
  const toSample = (frame: number) => frameToSample(frame, rate, table.fps);

  const orchestralScore: Score = {
    fps: rawScore.fps,
    instruments: {
      piano_felt: rawScore.instruments.piano_felt,
      strings_pad: rawScore.instruments.strings_pad,
      harp: rawScore.instruments.harp,
      glockenspiel: rawScore.instruments.glockenspiel,
    },
    sections: rawScore.sections,
    phrases: rawScore.phrases.filter((p) => p.id !== "hum"),
  };

  const voices = compileScore(orchestralScore, table, seed);
  const stems: Record<"music" | "sfx" | "ambience", Stereo> = {
    music: stereo(count),
    sfx: stereo(count),
    ambience: stereo(count),
  };

  const groups = new Map<number, Stereo>();
  for (const voice of voices) {
    const bus = groups.get(voice.cutoff) ?? stereo(count);
    groups.set(voice.cutoff, bus);
    place(bus, { samples: voice.samples, alignmentSample: 0 }, voice.start);
  }
  for (const [cutoff, dry] of groups) {
    const wet = reverb(dry, scenes.music, 0.22);
    for (let c = 0; c < 2; c++) {
      for (let i = 0; i < count; i++) {
        wet[c][i] *= Math.max(0, Math.min(1, (cutoff - 1 - i) / (rate * 0.15)));
      }
    }
    add(stems.music, wet);
  }

  const humEvent = table.events.find((e) => e.kind === "hum_start");
  if (humEvent) {
    const humClip = synthesizeHumClip(rawScore as unknown as Parameters<typeof synthesizeHumClip>[0], seedFor(seed, "hum"));
    const humDry = stereo(count);
    const startSample = toSample(humEvent.frame);
    place(humDry, humClip, startSample, dbGain(-13), 0.15, 0.2);
    for (let i = startSample; i < count; i++) {
      const sec = (i - startSample) / rate;
      const distGain = Math.max(0.22, Math.exp(-Math.max(0, sec - 1.5) * 0.28));
      humDry[0][i] *= distGain;
      humDry[1][i] *= distGain;
    }
    add(stems.sfx, reverb(humDry, scenes.garden, 0.22));
  }

  const heroSamples: number[] = [];
  const placements: { kind: string; shotId: string; frame: number; sfx: TempSfxName }[] = [];
  const sortedEvents = [...table.events].sort((a, b) => a.frame - b.frame);
  for (let idx = 0; idx < sortedEvents.length; idx++) {
    const ev = sortedEvents[idx];
    const mapping = eventSfxMap[ev.kind];
    if (!mapping) continue;
    const clip = synthesizeTempSfx(mapping.sfx, seedFor(seed, `${ev.shotId}/${ev.kind}/${idx}`));
    const dry = stereo(count);
    const alignedSample = toSample(ev.frame);
    const dbOffset = ev.shotId === "s11" && ev.kind === "wingbeat" ? -7 : 0;
    place(dry, clip, alignedSample, dbGain(mapping.db + dbOffset), mapping.pan, 0.35);
    add(stems.sfx, reverb(dry, scenes[mapping.scene], 0.16));
    if (mapping.hero) heroSamples.push(alignedSample);
    placements.push({ kind: ev.kind, shotId: ev.shotId, frame: ev.frame, sfx: mapping.sfx });
  }

  const addBed = (
    name: keyof typeof beds,
    db: number,
    sceneKey: "garden" | "open",
    fadeInFrames: number,
    fadeOutFrames: number,
  ) => {
    const { from: fromFrame, to: toFrame, density } = beds[name];
    const start = toSample(fromFrame);
    const end = toSample(toFrame);
    const clip = synthesizeTempSfx(name, seedFor(seed, `bed/${name}/${fromFrame}`), {
      seconds: (end - start) / rate,
      density: density?.map(([f, v]) => [(toSample(f) - start) / rate, v]),
    });
    const dry = stereo(count);
    place(dry, clip, start, dbGain(db), 0, 0.85);
    const wet = reverb(dry, scenes[sceneKey], 0.18);
    const fadeIn = toSample(fadeInFrames);
    const fadeOut = toSample(fadeOutFrames);
    for (let i = 0; i < count; i++) {
      if (i < start || i >= end) {
        wet[0][i] = 0;
        wet[1][i] = 0;
        continue;
      }
      const gIn = fadeIn > 0 ? Math.min(1, (i - start) / fadeIn) : 1;
      const gOut = fadeOut > 0 ? Math.min(1, (end - 1 - i) / fadeOut) : 1;
      wet[0][i] *= gIn * gOut;
      wet[1][i] *= gIn * gOut;
    }
    add(stems.ambience, wet);
  };

  addBed("garden_air", -30, "garden", 0, 0);
  addBed("heavy_rain", -18, "garden", 2, 12);
  addBed("rain_tail", -22, "garden", 4, 48);
  addBed("eave_drips", -27, "garden", 12, 36);
  addBed("higurashi", -29, "garden", 48, 20);
  addBed("paddy_wind", -26, "open", 36, 20);

  const s08Start = toSample(hush.from);
  const s08End = toSample(hush.to);
  const edge = Math.round(rate * 0.04);
  for (let i = Math.max(0, s08Start - edge); i < Math.min(count, s08End + edge); i++) {
    const g = curve(
      [
        [s08Start - edge, 1],
        [s08Start, dbGain(-5)],
        [s08End - 1, dbGain(-5)],
        [s08End + edge, 1],
      ],
      i,
    );
    stems.ambience[0][i] *= g;
    stems.ambience[1][i] *= g;
  }

  const attack = (10 * rate) / 1000;
  const holdMs = (50 * rate) / 1000;
  const release = (380 * rate) / 1000;
  for (let i = 0; i < count; i++) {
    let gain = 1;
    for (const at of heroSamples) {
      if (i < at - attack || i > at + holdMs + release) continue;
      gain = Math.min(
        gain,
        dbGain(
          curve(
            [
              [at - attack, 0],
              [at, -6],
              [at + holdMs, -6],
              [at + holdMs + release, 0],
            ],
            i,
          ),
        ),
      );
    }
    stems.music[0][i] *= gain;
    stems.music[1][i] *= gain;
  }

  const fadeStart = toSample(resolveAnchor({ event: "fade_out" }, table));
  const fadeSpan = Math.max(1, count - fadeStart);
  const mix = stereo(count);
  for (const bus of Object.values(stems)) {
    for (let i = fadeStart; i < count; i++) {
      const g = (count - 1 - i) / fadeSpan;
      bus[0][i] *= g;
      bus[1][i] *= g;
    }
    add(mix, bus);
  }

  return { mix, stems, voices, placements, durationFrames };
};

const main = () => {
  let values: { events?: string; out?: string; seed?: string; help?: boolean };
  try {
    ({ values } = parseArgs({
      options: {
        events: { type: "string" },
        out: { type: "string" },
        seed: { type: "string" },
        help: { type: "boolean" },
      },
      allowPositionals: false,
    }));
  } catch (error) {
    throw usageError(error instanceof Error ? error.message : String(error), usage);
  }

  if (values.help) {
    console.log(
      `用法：${usage}\n生成《雨后》预演 48 kHz 双声道临时混音与分轨（-16 LUFS ±1 LU，真峰值 <= -1 dBTP）。\n默认事件表：episodes/after-rain/data/events.json；默认输出：out/qa/spec-168/185/sound；默认种子 185。`,
    );
  } else {
    const seedText = values.seed ?? "185";
    if (!/^\d+$/.test(seedText) || !Number.isSafeInteger(Number(seedText)) || Number(seedText) > 0xffffffff) {
      throw usageError("种子必须是 0–4294967295 的整数。", usage);
    }
    const seed = Number(seedText);
    const eventsPath = values.events ? resolve(values.events) : join(episode, "data/events.json");
    const outDir = values.out ? resolve(values.out) : join(root, "out/qa/spec-168/185/sound");
    const table = JSON.parse(readFileSync(eventsPath, "utf8")) as EventTable;
    const rawScore = JSON.parse(readFileSync(join(episode, "score.json"), "utf8"));
    const started = performance.now();

    const rendered = renderTempMix(table, rawScore, seed);
    const mastered = master(rendered.mix, rendered.stems, -16, -1, 1);

    mkdirSync(outDir, { recursive: true });
    const files: { path: string; sha256: string; bytes: number; levels?: ReturnType<typeof levels>; loudness?: ReturnType<typeof measure> }[] = [];
    const saveAudio = (name: string, channels: readonly Float64Array[], doLoudness: boolean) => {
      const buf = pcmWav(channels);
      const abs = join(outDir, name);
      writeFileSync(abs, buf);
      files.push({
        path: name,
        sha256: hash(buf),
        bytes: buf.length,
        levels: levels(channels),
        loudness: doLoudness ? measure(channels) : undefined,
      });
    };

    saveAudio("mix.wav", mastered.output, true);
    saveAudio("music.wav", rendered.stems.music, true);
    saveAudio("sfx.wav", rendered.stems.sfx, true);
    saveAudio("ambience.wav", rendered.stems.ambience, true);

    const report = {
      seed,
      fps: table.fps,
      sampleRate: rate,
      durationFrames: rendered.durationFrames,
      durationSeconds: rendered.durationFrames / table.fps,
      eventsPath: relative(root, eventsPath),
      voicesCount: rendered.voices.length,
      placementsCount: rendered.placements.length,
      master: {
        before: mastered.before,
        after: mastered.after,
        gainDb: mastered.gainDb,
        maximumReductionDb: mastered.maximumReductionDb,
        limiterCeilingDbfs: mastered.limiterCeilingDbfs,
      },
      files,
      seconds: (performance.now() - started) / 1000,
    };
    writeFileSync(join(outDir, "measurements.json"), `${JSON.stringify(report, null, 2)}\n`);
    console.log(
      `临时声音生成完成：${outDir}\n混音 ${mastered.after.integratedLufs.toFixed(1)} LUFS，真峰值 ${mastered.after.truePeakDbtp.toFixed(1)} dBTP；${rendered.voices.length} 颗乐音、${rendered.placements.length} 次事件音效；耗时 ${report.seconds.toFixed(2)} 秒。`,
    );
  }
};

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    reportError(error);
    if (error instanceof MeasurementFailure) process.exitCode = 1;
  }
}

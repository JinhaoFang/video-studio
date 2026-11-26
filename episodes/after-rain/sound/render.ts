/**
 * 《雨后》全片声音渲染入口（#185 建于预演，#202 换上正式的雨、屋里的说话和哼唱的电平，其余层仍是 #185 的临时声音）：
 * 运行 `node episodes/after-rain/sound/render.ts [--events <事件表>] [--out <目录>] [--seed <整数>] [--stems] [--help]`。
 * 绕开 src/kit/sound/mix.ts 的 validateEvents 不支持叠化重叠镜头表的限制，直接调用 kit 的 compileScore、synthesizeVoice、synthesizeChirp、reverb 与 master，
 * 生成 48 kHz 双声道混音（-16 LUFS ±1 LU，真峰值 <= -1 dBTP，全程底噪不断、无数字静音断音）与分轨；
 * 分段规矩同 #201：按场次的声音取时间表（shotTable），跟着动作的声音取画面事件（events）。
 * --stems 另外导出雨的每一层、雨的合成、人声子组（屋里的说话、哼唱）和验收用的混音片段，并在 measurements.json 里写下分轨电平的测量。
 * 退出码：0 通过/帮助，1 响度验收不通过，2 参数或运行出错。
 * 待定事项：正式的拟音、叫声与全片混音由 #193 替换。
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
import type { Clip, EventTable, Scene, Score, Stereo } from "../../../src/kit/sound/types.ts";
import { reportError, usageError } from "../../../tools/cli.ts";
import { shotRow } from "../model.ts";
import { bandLevels, envelope } from "./analyze.ts";
import { RAIN_LAYERS, rainPlan, synthesizeRain, type RainLayer, type RainPlan } from "./rain.ts";
import {
  synthesizeHumClip,
  synthesizeTempSfx,
  type TempSfxName,
} from "./sfx.ts";
import { synthesizeWalla } from "./walla.ts";

const usage =
  "node episodes/after-rain/sound/render.ts [--events <事件表>] [--out <目录>] [--seed <整数>] [--stems] [--help]";
const root = resolve(import.meta.dirname, "../../..");
const episode = join(root, "episodes/after-rain");

const scenes: Record<"eaves" | "garden" | "open" | "music" | "rainYard", Scene> = {
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
  rainYard: {
    t60: 0.5,
    preDelayMs: 14,
    earlyReflectionsMs: [17, 31, 49],
    highCutHz: 3600,
  },
};

type EventMapping = {
  sfx: TempSfxName;
  db: number;
  pan: number;
  scene: "eaves" | "garden" | "open" | "rainYard";
  hero?: boolean;
};

const eventSfxMap: Record<string, EventMapping | undefined> = {
  thunder: { sfx: "thunder", db: -12, pan: 0, scene: "rainYard" },
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

export const rainMixDb: Record<RainLayer, number> = {
  curtain: 0,
  tile: -7,
  wood: -12,
  leaves: -10,
  bamboo: -8,
  puddles: -8,
  gutters: -6,
  lastDrops: -4,
};

export const RAIN_RMS_DBFS = -32.5;
export const RAIN_WET = 0.18;
export const VOICE_BAND = [300, 1000] as const;
export const WALLA_BELOW_DB = 3;
export const SPECTRUM_BANDS = [
  { low: 20, high: 200 },
  { low: 200, high: 500 },
  { low: 500, high: 1000 },
  { low: 1000, high: 2000 },
  { low: 2000, high: 4000 },
  { low: 4000, high: 8000 },
  { low: 8000, high: 16000 },
] as const;
export const HUM_ABOVE_DB = 10;
export const HUM_NEAR_SECONDS = 1.5;
export const HUM_FAR_DB = -7;
export const HUM_TURN_CUTOFF_HZ = 5000;
export const HUM_FAR_CUTOFF_HZ = 2000;
export const HUM_PAN = [0.15, 0.4] as const;
export const HUM_WET = [0.22, 0.45] as const;

const hash = (data: string | Uint8Array) =>
  createHash("sha256").update(data).digest("hex");

export const ambienceTiming = (table: EventTable, seed = 185) => {
  const start = (id: string) => shotRow(table.shotTable, id).startFrame;
  const end = (id: string) => {
    const row = shotRow(table.shotTable, id);
    return row.startFrame + row.durationInFrames;
  };
  const bed = (from: number, to: number, density?: [number, number][]) => ({ from, to, density });
  const durationFrames = filmDuration(table.shotTable);
  const hush = { from: start("s08"), to: end("s08") };
  const plan = rainPlan(table, seed);
  const beds = {
    garden_air: bed(start("s01"), durationFrames),
    eave_drips: bed(start("s03"), hush.to, [
      [start("s03"), 1.0], [start("s04"), 0.45], [hush.from, 0.18], [hush.to, 0.12],
    ]),
    higurashi: bed(start("s03") + 72, durationFrames),
    paddy_wind: bed(start("s04"), durationFrames, [
      [start("s04"), 0.4], [hush.from, 0.35], [start("s11"), 1.1], [end("s11"), 0.45], [durationFrames, 0.35],
    ]),
  };
  return {
    durationFrames,
    beds,
    hush,
    rain: {
      from: plan.fromFrame,
      to: plan.toFrame,
      open: resolveAnchor({ event: "open" }, table),
      rainTail: resolveAnchor({ event: "rain_tail" }, table),
    },
  };
};

const sweepLowPass = (channel: Float64Array, from: number, to: number, fromHz: number, toHz: number, stages = 2) => {
  const state = new Float64Array(stages);
  for (let i = Math.max(0, from); i < Math.min(channel.length, to); i++) {
    const hz = Math.exp(curve([[from, Math.log(fromHz)], [to, Math.log(toHz)]], i));
    const alpha = 1 - Math.exp((-2 * Math.PI * hz) / rate);
    state[0] += alpha * (channel[i] - state[0]);
    for (let k = 1; k < stages; k++) state[k] += alpha * (state[k - 1] - state[k]);
    channel[i] = state[stages - 1];
  }
};

const scale = (bus: Stereo, gain: number, from = 0, to = bus[0].length) => {
  for (const channel of bus)
    for (let i = Math.max(0, from); i < Math.min(channel.length, to); i++) channel[i] *= gain;
};

export type RawScore = Score & { phrases: { id: string; tempo: number; notes: { instrument: string }[] }[] };

export const humShots = (table: EventTable) => {
  const event = table.events.find((e) => e.kind === "hum_start");
  if (!event) throw new Error("哼唱需要 hum_start 画面事件。");
  const shot = shotRow(table.shotTable, event.shotId);
  const next = table.shotTable.find(
    (row) => row.startFrame === shot.startFrame + shot.durationInFrames,
  );
  if (!next) throw new Error("哼唱需要 hum_start 所在镜头的下一镜。");
  return { event, shot, next };
};

export const renderHum = (
  table: EventTable,
  humClip: Clip,
  count: number,
  toSample: (frame: number) => number,
  ambienceRmsDbfs: (from: number, to: number) => number,
): { output: Stereo; gainDb: number; near: { from: number; to: number }; far: { from: number; to: number } } => {
  const { event, shot, next } = humShots(table);
  const start = toSample(event.frame);
  const nearEnd = Math.min(count, start + Math.round(HUM_NEAR_SECONDS * rate));
  const farEnd = Math.min(count, toSample(next.startFrame + next.durationInFrames));
  const shotEnd = toSample(shot.startFrame + shot.durationInFrames);
  const dry = stereo(count);
  place(dry, humClip, start, 1, HUM_PAN[0], 0.2);
  const near = stereo(count);
  const far = stereo(count);
  for (let c = 0; c < 2; c++) {
    for (let i = start; i < count; i++) {
      const pan = curve([[nearEnd, HUM_PAN[0]], [farEnd, HUM_PAN[1]]], i);
      const gain = curve([[nearEnd, 1], [farEnd, dbGain(HUM_FAR_DB)]], i);
      const widen = (c === 0 ? Math.cos : Math.sin)(((pan + 1) * Math.PI) / 4) /
        (c === 0 ? Math.cos : Math.sin)(((HUM_PAN[0] + 1) * Math.PI) / 4);
      dry[c][i] *= gain * widen;
    }
    sweepLowPass(dry[c], nearEnd, farEnd, HUM_TURN_CUTOFF_HZ, HUM_FAR_CUTOFF_HZ);
    for (let i = 0; i < count; i++) {
      near[c][i] = i < nearEnd ? dry[c][i] : 0;
      far[c][i] = i >= nearEnd ? dry[c][i] : 0;
    }
  }
  const output = [dry[0].slice(), dry[1].slice()] as Stereo;
  add(output, reverb(near, scenes.garden, HUM_WET[0]));
  add(output, reverb(far, scenes.garden, HUM_WET[1]));
  const gainDb =
    ambienceRmsDbfs(start, shotEnd) + HUM_ABOVE_DB - rmsDbfs(output, start, shotEnd);
  scale(output, dbGain(gainDb));
  return { output, gainDb, near: { from: start, to: nearEnd }, far: { from: nearEnd, to: farEnd } };
};

export const bandRmsDbfs = (bus: Stereo, from: number, to: number, low: number, high: number) => {
  const start = Math.max(0, Math.min(bus[0].length, from));
  const end = Math.max(start + 1, Math.min(bus[0].length, to));
  return bandLevels([bus[0].subarray(start, end), bus[1].subarray(start, end)], rate, 0, (end - start) / rate, [
    { low, high },
  ]).bands[`${low}-${high}`];
};

export const rmsDbfs = (bus: Stereo, from = 0, to = bus[0].length) => {
  const start = Math.max(0, Math.min(bus[0].length, from));
  const end = Math.max(start + 1, Math.min(bus[0].length, to));
  let energy = 0;
  for (const channel of bus) for (let i = start; i < end; i++) energy += channel[i] ** 2;
  return 10 * Math.log10(Math.max(1e-30, energy / ((end - start) * 2)));
};

export type RainStem = { layers: Record<RainLayer, Stereo>; dry: Stereo; hits: Record<RainLayer, number>; plan: RainPlan };

export const renderTempMix = (table: EventTable, rawScore: RawScore, seed: number) => {
  const { durationFrames, beds, hush } = ambienceTiming(table, seed);
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
  const stems: Record<"music" | "sfx" | "ambience" | "voice", Stereo> = {
    music: stereo(count),
    sfx: stereo(count),
    ambience: stereo(count),
    voice: stereo(count),
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

  const rain = synthesizeRain(table, seed, toSample);
  const reference = synthesizeRain(table, seed, toSample, true);
  const rainLayers = Object.fromEntries(
    RAIN_LAYERS.map((layer) => [layer, stereo(count)]),
  ) as Record<RainLayer, Stereo>;
  const rainDry = stereo(count);
  for (const layer of RAIN_LAYERS) {
    const gain = dbGain(rainMixDb[layer] + RAIN_RMS_DBFS - rmsDbfs(reference.layers[layer]));
    for (let c = 0; c < 2; c++) {
      rainLayers[layer][c].set(rain.layers[layer][c].map((value) => value * gain), rain.fromSample);
    }
    add(rainDry, rainLayers[layer]);
  }
  add(stems.ambience, reverb(rainDry, scenes.rainYard, RAIN_WET));

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

  const walla = synthesizeWalla(table, seed, count, toSample);
  const wallaGainDb =
    bandRmsDbfs(stems.ambience, walla.shotRange.from, walla.shotRange.to, VOICE_BAND[0], VOICE_BAND[1]) -
    WALLA_BELOW_DB -
    bandRmsDbfs(walla.output, walla.shotRange.from, walla.shotRange.to, VOICE_BAND[0], VOICE_BAND[1]);
  scale(walla.output, dbGain(wallaGainDb));
  add(stems.voice, walla.output);

  const hum = renderHum(
    table,
    synthesizeHumClip(rawScore, seedFor(seed, "hum")),
    count,
    toSample,
    (from, to) => rmsDbfs(stems.ambience, from, to),
  );
  add(stems.voice, hum.output);
  add(stems.sfx, stems.voice);

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
  for (const bus of [stems.music, stems.sfx, stems.ambience, stems.voice]) {
    for (let i = fadeStart; i < count; i++) {
      const g = (count - 1 - i) / fadeSpan;
      bus[0][i] *= g;
      bus[1][i] *= g;
    }
    add(mix, bus);
  }

  return {
    mix,
    stems,
    rain: { layers: rainLayers, dry: rainDry, hits: rain.hits, plan: rain.plan } satisfies RainStem,
    walla,
    wallaGainDb,
    hum,
    voices,
    placements,
    durationFrames,
  };
};

const slice = (bus: Stereo, from: number, to: number): Stereo => [
  bus[0].slice(Math.max(0, from), Math.min(bus[0].length, to)),
  bus[1].slice(Math.max(0, from), Math.min(bus[1].length, to)),
];

const main = () => {
  let values: { events?: string; out?: string; seed?: string; stems?: boolean; help?: boolean };
  try {
    ({ values } = parseArgs({
      options: {
        events: { type: "string" },
        out: { type: "string" },
        seed: { type: "string" },
        stems: { type: "boolean" },
        help: { type: "boolean" },
      },
      allowPositionals: false,
    }));
  } catch (error) {
    throw usageError(error instanceof Error ? error.message : String(error), usage);
  }

  if (values.help) {
    console.log(
      `用法：${usage}\n生成《雨后》48 kHz 双声道混音与分轨（-16 LUFS ±1 LU，真峰值 <= -1 dBTP）。\n默认事件表：episodes/after-rain/data/events.json；默认输出：out/qa/spec-168/185/sound；默认种子 185。\n--stems 另外导出雨的每一层、雨的合成、人声子组和验收用的混音片段，并写下分轨电平的测量。`,
    );
    return;
  }
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
  const toSample = (frame: number) => frameToSample(frame, rate, table.fps);
  const extra: Record<string, Stereo> = {
    walla: rendered.walla.output,
    hum: rendered.hum.output,
    ...Object.fromEntries(RAIN_LAYERS.map((layer) => [`rain-${layer}`, rendered.rain.layers[layer]])),
  };
  const mastered = master(rendered.mix, { ...rendered.stems, ...extra }, -16, -1, 1);

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

  const wallaTo = rendered.walla.shotRange.to;
  const wallaShots = rendered.walla.shots;
  const wallaLines = rendered.walla.lines.map(({ shot, at, seconds, ...line }) => {
    const from = toSample(shotRow(table.shotTable, wallaShots[shot].id).startFrame) + Math.round(at * rate);
    const to = Math.min(wallaTo, from + Math.round(seconds * rate));
    const voice = bandRmsDbfs(rendered.stems.voice, from, to, VOICE_BAND[0], VOICE_BAND[1]);
    const ambience = bandRmsDbfs(rendered.stems.ambience, from, to, VOICE_BAND[0], VOICE_BAND[1]);
    return { shot: wallaShots[shot].id, at, seconds, ...line, from, to, voice300to1000Dbfs: voice, ambience300to1000Dbfs: ambience, voiceBelowAmbienceDb: ambience - voice };
  });
  const lull = { from: toSample(rendered.rain.plan.lull.fromFrame), to: toSample(rendered.rain.plan.lull.toFrame) };
  const lullLevels = {
    from: lull.from,
    to: lull.to,
    voice300to1000Dbfs: bandRmsDbfs(rendered.stems.voice, lull.from, lull.to, VOICE_BAND[0], VOICE_BAND[1]),
    ambience300to1000Dbfs: bandRmsDbfs(rendered.stems.ambience, lull.from, lull.to, VOICE_BAND[0], VOICE_BAND[1]),
  };
  const humNear = rendered.hum.near;
  const humLevels = {
    from: humNear.from,
    to: humNear.to,
    voiceDbfs: rmsDbfs(rendered.stems.voice, humNear.from, humNear.to),
    ambienceDbfs: rmsDbfs(rendered.stems.ambience, humNear.from, humNear.to),
  };
  const first = shotRow(table.shotTable, wallaShots[0].id);
  const curtainMono = Float64Array.from(rendered.rain.layers.curtain[0], (value, i) => (value + rendered.rain.layers.curtain[1][i]) / 2);
  const firstFrom = toSample(first.startFrame);
  const firstTo = toSample(first.startFrame + first.durationInFrames);
  const curtainEnvelope = envelope(curtainMono, rate, 0.25, firstFrom / rate, firstTo / rate);
  const sorted = [...curtainEnvelope].sort((a, b) => a - b);
  const at = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];

  const report: Record<string, unknown> = {
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
    rain: {
      hits: rendered.rain.hits,
      plan: { fromFrame: rendered.rain.plan.fromFrame, toFrame: rendered.rain.plan.toFrame, lull: rendered.rain.plan.lull },
      mixDb: rainMixDb,
      referenceRmsDbfs: RAIN_RMS_DBFS,
      firstShot: { from: firstFrom, to: firstTo },
      curtainEnvelopeDb: { stepSeconds: 0.25, p10: at(0.1), p50: at(0.5), p90: at(0.9), spread: at(0.9) - at(0.1) },
      curtainBands: Object.fromEntries(
        SPECTRUM_BANDS.map(({ low, high }) => [`${low}-${high}`, bandRmsDbfs(rendered.rain.layers.curtain, firstFrom, firstTo, low, high)]),
      ),
    },
    walla: {
      lines: wallaLines,
      gainDb: rendered.wallaGainDb,
      lull: { ...lullLevels, voiceAboveAmbienceDb: lullLevels.voice300to1000Dbfs - lullLevels.ambience300to1000Dbfs },
    },
    hum: {
      gainDb: rendered.hum.gainDb,
      near: { ...humLevels, voiceAboveAmbienceDb: humLevels.voiceDbfs - humLevels.ambienceDbfs },
      far: {
        ...rendered.hum.far,
        voiceDbfs: rmsDbfs(rendered.stems.voice, rendered.hum.far.from, rendered.hum.far.to),
        ambienceDbfs: rmsDbfs(rendered.stems.ambience, rendered.hum.far.from, rendered.hum.far.to),
      },
    },
    files,
    seconds: 0,
  };

  if (values.stems) {
    const rainFrom = toSample(rendered.rain.plan.fromFrame);
    const rainTo = toSample(rendered.rain.plan.toFrame) + Math.round(rate * 2);
    const layers = rendered.rain.layers;
    for (const layer of RAIN_LAYERS) saveAudio(`rain-${layer}.wav`, slice(layers[layer], rainFrom, rainTo), false);
    const rainSum: Stereo = [
      layers.curtain[0].map((_, i) => RAIN_LAYERS.reduce((sum, layer) => sum + layers[layer][0][i], 0)),
      layers.curtain[1].map((_, i) => RAIN_LAYERS.reduce((sum, layer) => sum + layers[layer][1][i], 0)),
    ];
    saveAudio("rain-sum.wav", slice(rainSum, rainFrom, rainTo), false);
    saveAudio("voice.wav", rendered.stems.voice, false);
    saveAudio("hum.wav", rendered.hum.output, false);
    saveAudio("walla.wav", rendered.walla.output, false);
    const second = shotRow(table.shotTable, wallaShots[1].id);
    const clips: Record<string, [Stereo, number, number]> = {
      "mix-s01-02.wav": [mastered.output, toSample(first.startFrame), toSample(second.startFrame + second.durationInFrames)],
      "mix-s06-07.wav": [mastered.output, toSample(humShots(table).shot.startFrame), rendered.hum.far.to],
      "rain-s01.wav": [rendered.stems.ambience, firstFrom, firstTo],
    };
    for (const [name, [bus, from, to]] of Object.entries(clips)) saveAudio(name, slice(bus, from, to), false);
    report.stems = [...Object.keys(clips), "voice.wav", "hum.wav", "walla.wav", ...RAIN_LAYERS.map((layer) => `rain-${layer}.wav`), "rain-sum.wav"];
  }
  report.seconds = (performance.now() - started) / 1000;
  writeFileSync(join(outDir, "measurements.json"), `${JSON.stringify(report, null, 2)}\n`);
  console.log(
    `声音生成完成：${outDir}\n混音 ${mastered.after.integratedLufs.toFixed(1)} LUFS，真峰值 ${mastered.after.truePeakDbtp.toFixed(1)} dBTP；${rendered.voices.length} 颗乐音、${rendered.placements.length} 次事件音效；耗时 ${(report.seconds as number).toFixed(2)} 秒。`,
  );
  const lines = wallaLines.filter((line) => line.shot === wallaShots[0].id);
  const spoken = lines.filter((line) => !line.laugh).map((line) => line.voiceBelowAmbienceDb);
  const laugh = lines.find((line) => line.laugh);
  const lullReport = report.walla as { lull: { voiceAboveAmbienceDb: number } };
  const humReport = report.hum as { near: { voiceAboveAmbienceDb: number }; far: { voiceDbfs: number; ambienceDbfs: number } };
  console.log(
    `雨幕（${first.id}）0.25 秒包络 p10–p90 起伏 ${(report.rain as { curtainEnvelopeDb: { spread: number } }).curtainEnvelopeDb.spread.toFixed(1)} dB；` +
      `第 1 镜屋里的说话（${spoken.length} 句）300–1000 Hz 比环境轨低 ${Math.min(...spoken).toFixed(1)}–${Math.max(...spoken).toFixed(1)} dB` +
      `${laugh ? `，轻笑那一下比环境轨${laugh.voiceBelowAmbienceDb >= 0 ? "低" : "高"} ${Math.abs(laugh.voiceBelowAmbienceDb).toFixed(1)} dB` : ""}；` +
      `阵风低谷里人声${lullReport.lull.voiceAboveAmbienceDb >= 0 ? "不低于" : "低于"}环境轨 ${Math.abs(lullReport.lull.voiceAboveAmbienceDb).toFixed(1)} dB；` +
      `哼唱近段比环境轨高 ${humReport.near.voiceAboveAmbienceDb.toFixed(1)} dB，远段（${((rendered.hum.far.from - rendered.hum.near.from) / rate).toFixed(2)} 秒后起）比环境轨高 ${humReport.far.voiceDbfs - humReport.far.ambienceDbfs >= 0 ? "" : "负 "}${Math.abs(humReport.far.voiceDbfs - humReport.far.ambienceDbfs).toFixed(1)} dB。`,
  );
};

if (import.meta.main) {
  try {
    main();
  } catch (error) {
    reportError(error);
    if (error instanceof MeasurementFailure) process.exitCode = 1;
  }
}

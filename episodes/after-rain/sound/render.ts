/** 《雨后》正片混音。运行 node episodes/after-rain/sound/render.ts [--events <事件表>] [--out <目录>] [--seed <整数>] [--stems]。
 * 由时间表、画面接触及乐谱锚点合成三轨。人声是音效的子组，分轨与成片共用母带增益。--stems 交出分层试听、关键镜头、落位与电平记录。
 * 退出码 0 表示完成或帮助，1 表示响度验收失败，2 表示参数或生成错误。待定事项：听感由导演复核。
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
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
import { master, MeasurementFailure } from "../../../src/kit/sound/measure.ts";
import { compileScore, resolveAnchor } from "../../../src/kit/sound/score.ts";
import type {
  Clip,
  EventTable,
  Score,
  Stereo,
} from "../../../src/kit/sound/types.ts";
import { reportError, usageError } from "../../../tools/cli.ts";
import { shotRow } from "../model.ts";
import { bandLevels } from "./analyze.ts";
import {
  RAIN_LAYERS,
  rainPlan,
  synthesizeRain,
  type RainLayer,
} from "./rain.ts";
import { synthesizeHumClip, synthesizeSfx } from "./sfx.ts";
import { renderSpots, rooms } from "./spotting.ts";
import { synthesizeWalla } from "./walla.ts";

const usage =
  "node episodes/after-rain/sound/render.ts [--events <事件表>] [--out <目录>] [--seed <整数>] [--stems] [--help]";
const root = resolve(import.meta.dirname, "../../..");
const defaultOut = "out/qa/spec-168/193";
export type RawScore = Score & Parameters<typeof synthesizeHumClip>[0];
export const rainMixDb: Record<RainLayer, number> = {
  curtain: 0,
  tile: -7,
  wood: -8.6,
  leaves: -10,
  bamboo: -8,
  puddles: -8,
  gutters: -6,
  lastDrops: -4,
};
export const RAIN_RMS_DBFS = -32.5;
export const ambienceTiming = (table: EventTable, seed = 185) => {
  const start = (id: string) => shotRow(table.shotTable, id).startFrame;
  const end = (id: string) =>
    start(id) + shotRow(table.shotTable, id).durationInFrames;
  const bed = (from: number, to: number, density?: [number, number][]) => ({
    from,
    to,
    density,
  });
  const durationFrames = filmDuration(table.shotTable);
  const hush = { from: start("s08"), to: end("s08") };
  const plan = rainPlan(table, seed);
  const beds = {
    garden_air: bed(start("s01"), durationFrames),
    eave_drips: bed(start("s03"), hush.to),
    higurashi: bed(start("s03") + 72, durationFrames),
    paddy_wind: bed(start("s04"), durationFrames, [
      [start("s04"), 0.48],
      [start("s11") - 1, 0.48],
      [start("s11") + 6, 1.1],
      [start("s12"), 1.1],
      [end("s11"), 0.45],
      [durationFrames, 0.35],
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

export const rmsDbfs = (bus: Stereo, from = 0, to = bus[0].length) => {
  let energy = 0;
  for (const channel of bus)
    for (let i = from; i < to; i++) energy += channel[i] ** 2;
  return 10 * Math.log10(Math.max(1e-30, energy / ((to - from) * 2)));
};
const scale = (bus: Stereo, gain: number) => {
  for (const channel of bus)
    for (let i = 0; i < channel.length; i++) channel[i] *= gain;
};
const band = (
  bus: Stereo,
  from: number,
  to: number,
  low: number,
  high: number,
) =>
  bandLevels(bus, rate, from / rate, to / rate, [{ low, high }]).bands[
    `${low}-${high}`
  ];
const cut = (bus: Stereo, from: number, to: number): Stereo => [
  bus[0].subarray(from, to),
  bus[1].subarray(from, to),
];

export const renderHum = (
  table: EventTable,
  clip: Clip,
  count: number,
  toSample: (frame: number) => number,
  ambienceRmsDbfs: (from: number, to: number) => number,
) => {
  const start = toSample(resolveAnchor({ event: "hum_start" }, table));
  const next = shotRow(table.shotTable, "s07");
  const cutPoint = toSample(next.startFrame),
    end = toSample(next.startFrame + next.durationInFrames);
  const nearEnd = Math.min(cutPoint, start + Math.round(1.0 * rate));
  const farAt = Math.min(
    end,
    start + clip.samples.length,
    cutPoint + rate * 0.85,
  );
  const near = stereo(count),
    far = stereo(count);
  let low1 = 0,
    low2 = 0;
  for (let j = 0; j < clip.samples.length && start + j < count; j++) {
    const i = start + j;
    const u = curve(
      [
        [nearEnd, 0],
        [farAt, 1],
      ],
      i,
    );
    const pan =
      0.4 *
      curve(
        [
          [start, 0],
          [cutPoint, 1],
        ],
        i,
      );
    const alpha = 1 - Math.exp((-2 * Math.PI * (5000 * 0.4 ** u)) / rate);
    low1 += alpha * (clip.samples[j] - low1);
    low2 += alpha * (low1 - low2);
    const direct = (clip.samples[j] * (1 - u) + low2 * u) * dbGain(-8 * u);
    const angle = ((1 + pan) * Math.PI) / 4;
    for (let c = 0; c < 2; c++) {
      const value = direct * (c ? Math.sin(angle) : Math.cos(angle));
      near[c][i] = value * (1 - u);
      far[c][i] = value * u;
    }
  }
  const output = reverb(near, rooms.garden, 0.09);
  add(output, reverb(far, rooms.garden, 0.38));
  const gainDb =
    ambienceRmsDbfs(start, cutPoint) + 7.5 - rmsDbfs(output, start, cutPoint);
  scale(output, dbGain(gainDb));
  return {
    output,
    gainDb,
    near: { from: start, to: nearEnd },
    far: { from: nearEnd, to: end },
  };
};

const renderMusic = (
  table: EventTable,
  score: RawScore,
  seed: number,
  count: number,
) => {
  const voices = compileScore(
    { ...score, phrases: score.phrases.filter((p) => p.id !== "hum") },
    table,
    seed,
  );
  const music = stereo(count);
  for (const cutoff of new Set(voices.map((v) => v.cutoff))) {
    const group = voices.filter((v) => v.cutoff === cutoff);
    const start = Math.min(...group.map((v) => v.start));
    const dry = stereo(cutoff - start);
    for (const v of group)
      place(
        dry,
        { samples: v.samples, alignmentSample: 0 },
        v.start - start,
        dbGain(v.phrase === "flight" ? -0.8 : v.phrase === "puff" ? -2 : 0),
      );
    const wet = reverb(dry, rooms.music, 0.22);
    for (let c = 0; c < 2; c++)
      for (let j = 0; j < wet[c].length; j++)
        music[c][start + j] +=
          wet[c][j] * Math.min(1, (wet[c].length - j - 1) / (rate * 0.15));
  }
  return { music, voices };
};

export const renderMix = (table: EventTable, score: RawScore, seed: number) => {
  const { durationFrames, beds, hush } = ambienceTiming(table, seed);
  const toSample = (frame: number) => frameToSample(frame, rate, table.fps);
  const at = (shot: string) => shotRow(table.shotTable, shot).startFrame;
  const count = toSample(durationFrames);
  const { music, voices } = renderMusic(table, score, seed, count);
  const stems = {
    ambience: stereo(count),
    sfx: stereo(count),
    voice: stereo(count),
    music,
  };
  const { placements, heroSamples } = renderSpots(table, seed, toSample, stems);
  const rain = synthesizeRain(table, seed, toSample);
  const reference = synthesizeRain(table, seed, toSample, true);
  const rainDry = stereo(count);
  const layers = {} as Record<RainLayer, Stereo>;
  for (const layer of RAIN_LAYERS) {
    const gain = dbGain(
      rainMixDb[layer] + RAIN_RMS_DBFS - rmsDbfs(reference.layers[layer]),
    );
    layers[layer] = stereo(count);
    scale(rain.layers[layer], gain);
    for (let c = 0; c < 2; c++)
      layers[layer][c].set(rain.layers[layer][c], rain.fromSample);
    add(rainDry, layers[layer]);
  }
  add(stems.ambience, reverb(rainDry, rooms.rainYard, 0.18));
  const air = stereo(count);
  for (const name of ["garden_air", "higurashi", "paddy_wind"] as const) {
    const { from, to, density } = beds[name];
    const clip = synthesizeSfx(name, seedFor(seed, `bed/${name}`), {
      seconds: (to - from) / table.fps,
      density: density?.map(([f, v]) => [(f - from) / table.fps, v]),
    });
    const dry = stereo(count);
    place(dry, clip, toSample(from), 1, name === "higurashi" ? 0.32 : 0, 0.85);
    const yard = reverb(dry, rooms.garden, 0.16);
    const field = reverb(dry, rooms.open, 0.06),
      dusk = reverb(dry, rooms.dusk, 0.12);
    const afterRain = at("s03");
    const dbCurve: [number, number][] =
      name === "garden_air"
        ? [
            [at("s01"), -29],
            [afterRain, -29],
            [afterRain + 24, -6],
            [hush.from - 6, -6],
            [hush.from + 6, -12],
            [hush.to - 1, -12],
            [hush.to + 8, -9],
            [at("s12"), -9],
            [at("s12") + 24, -7],
          ]
        : name === "higurashi"
          ? [
              [from, -22],
              [from + 36, -10],
              [hush.from - 6, -10],
              [hush.from + 6, -14],
              [hush.to - 1, -14],
              [hush.to + 12, -12],
              [at("s12"), -12],
              [at("s12") + 24, -8],
            ]
          : [
              [from, -12],
              [hush.from - 6, -12],
              [hush.from + 6, -19],
              [hush.to - 1, -19],
              [hush.to + 8, -12],
              [at("s11"), -8],
            ];
    const gains = dbCurve.map(([f, db]) => [toSample(f), dbGain(db)] as const);
    const fieldView = [
      [at("s11") - 1, 0],
      [at("s11") + 4, 1],
      [at("s12"), 1],
      [at("s11") + shotRow(table.shotTable, "s11").durationInFrames, 0],
    ].map(([f, v]) => [toSample(f), v] as const);
    const duskStart = toSample(at("s12"));
    for (let i = toSample(from); i < count; i++) {
      const fieldWeight = curve(fieldView, i),
        duskWeight = i >= duskStart ? 1 - fieldWeight : 0;
      const gain =
        curve(gains, i) *
        (name === "garden_air" ? 1 : Math.min(1, (i - toSample(from)) / rate));
      for (let c = 0; c < 2; c++) {
        const value =
          gain *
          (yard[c][i] * (1 - fieldWeight - duskWeight) +
            field[c][i] * fieldWeight +
            dusk[c][i] * duskWeight);
        stems.ambience[c][i] += value;
        if (name === "garden_air") air[c][i] = value;
      }
    }
  }
  const walla = synthesizeWalla(table, seed, count, toSample);
  for (const [index, shot] of walla.shots.entries()) {
    const from = toSample(shot.from),
      to = toSample(shot.to);
    const gainDb =
      band(stems.ambience, from, to, 300, 1000) -
      (index === 0 ? 2.8 : 4.5) -
      band(walla.output, from, to, 300, 1000);
    scale(cut(walla.output, from, to), dbGain(gainDb));
  }
  add(stems.voice, walla.output);
  const hum = renderHum(
    table,
    synthesizeHumClip(score, seedFor(seed, "hum")),
    count,
    toSample,
    (a, b) => rmsDbfs(stems.ambience, a, b),
  );
  add(stems.voice, hum.output);
  add(stems.sfx, stems.voice);
  const duck = new Float64Array(count).fill(1);
  for (const anchor of heroSamples) {
    const points = [
      [anchor - rate * 0.01, 0],
      [anchor, -6],
      [anchor + rate * 0.05, -6],
      [anchor + rate * 0.43, 0],
    ] as const;
    for (
      let i = Math.max(0, points[0][0]);
      i < Math.min(count, points[3][0]);
      i++
    )
      duck[i] = Math.min(duck[i], dbGain(curve(points, i)));
  }
  const fadeStart = toSample(resolveAnchor({ event: "fade_out" }, table));
  const mix = stereo(count);
  for (let i = 0; i < count; i++) {
    const fade = Math.min(1, (count - 1 - i) / (count - 1 - fadeStart));
    for (let c = 0; c < 2; c++) {
      stems.music[c][i] *= duck[i] * fade;
      stems.ambience[c][i] *= fade;
      stems.sfx[c][i] *= fade;
      mix[c][i] = stems.music[c][i] + stems.ambience[c][i] + stems.sfx[c][i];
    }
  }
  return {
    mix,
    stems,
    layers,
    rainDry,
    rainPlan: rain.plan,
    air,
    hum,
    walla,
    voices,
    placements,
    durationFrames,
  };
};

const main = () => {
  let values;
  try {
    ({ values } = parseArgs({
      options: {
        events: { type: "string" },
        out: { type: "string" },
        seed: { type: "string" },
        stems: { type: "boolean" },
        help: { type: "boolean" },
      },
    }));
  } catch {
    throw usageError("无法识别参数。", usage);
  }
  if (values.help) {
    console.log(
      `用法：${usage}\n默认输出 ${defaultOut}。--stems 额外导出人声、雨层、试听和分层电平图。`,
    );
    return;
  }
  const seed = Number(values.seed ?? 185);
  if (
    !/^\d+$/.test(values.seed ?? "185") ||
    !Number.isSafeInteger(seed) ||
    seed > 0xffffffff
  )
    throw usageError("种子须为 0–4294967295 的整数。", usage);
  const table: EventTable = JSON.parse(
    readFileSync(
      resolve(
        values.events ?? join(root, "episodes/after-rain/data/events.json"),
      ),
      "utf8",
    ),
  );
  const score: RawScore = JSON.parse(
    readFileSync(join(root, "episodes/after-rain/score.json"), "utf8"),
  );
  const out = resolve(values.out ?? join(root, defaultOut));
  mkdirSync(out, { recursive: true });
  const result = renderMix(table, score, seed);
  const {
    mix,
    stems,
    rainDry,
    layers,
    hum,
    walla,
    placements,
    durationFrames,
  } = result;
  const mastered = master(
    mix,
    { ...stems, rainDry, ...layers, hum: hum.output, walla: walla.output },
    -16.2,
    -1.25,
  );
  const { before, after, gainDb, maximumReductionDb, limiterCeilingDbfs } =
    mastered;
  const sample = (f: number) => frameToSample(f, rate, table.fps);
  const range = (id: string) => {
    const row = shotRow(table.shotTable, id);
    return [
      sample(row.startFrame),
      sample(row.startFrame + row.durationInFrames),
    ] as const;
  };
  const save = (name: string, bus: Stereo) =>
    writeFileSync(join(out, `${name}.wav`), pcmWav(bus));
  save("mix", mastered.output);
  for (const name of ["ambience", "sfx", "music"] as const)
    save(name, stems[name]);
  if (values.stems) {
    for (const name of ["s01", "s08", "s11"])
      save(`mix-${name}`, cut(mastered.output, ...range(name)));
    save("mix-s06-07", cut(mastered.output, range("s06")[0], range("s07")[1]));
    save("mix-s01-02", cut(mastered.output, range("s01")[0], range("s02")[1]));
    save("hum", hum.output);
    save("voice", stems.voice);
    save("walla", walla.output);
    const rainEnd = sample(result.rainPlan.toFrame) + 2 * rate;
    save("rain-sum", cut(rainDry, 0, rainEnd));
    for (const layer of RAIN_LAYERS)
      save(`rain-${layer}`, cut(layers[layer], 0, rainEnd));
    const colors = ["#177e89", "#ba4a00", "#583c87", "#35651b"];
    const traces = [stems.ambience, stems.music, stems.sfx, stems.voice].map(
      (bus, k) => {
        const points = Array.from(
          { length: durationFrames },
          (_, f) =>
            `${f},${Math.min(60, -rmsDbfs(bus, sample(f), sample(f + 1))).toFixed(2)}`,
        ).join(" ");
        return `<polyline points="${points}" stroke="${colors[k]}" fill="none" stroke-width="1" vector-effect="non-scaling-stroke"/>`;
      },
    );
    const legend = ["环境", "配乐", "音效（含人声）", "人声子组"].map(
      (s, k) =>
        `<text x="${80 + k * 190}" y="30" fill="${colors[k]}">${s}</text>`,
    );
    writeFileSync(
      join(out, "stem-levels.svg"),
      `<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="400" viewBox="0 0 1280 400"><rect width="1280" height="400" fill="white"/>${legend.join("")}<text x="8" y="68">0 dBFS</text><text x="8" y="210">−30</text><text x="8" y="360">−60</text><svg x="65" y="60" width="1200" height="300" viewBox="0 0 ${durationFrames} 60" preserveAspectRatio="none">${traces.join("")}</svg>${table.shotTable.map((s) => `<text x="${65 + (1200 * s.startFrame) / durationFrames}" y="390">${s.id}</text>`).join("")}</svg>\n`,
    );
  }
  const report = {
    seed,
    sampleRate: rate,
    fps: table.fps,
    durationFrames,
    master: { before, after, gainDb, maximumReductionDb, limiterCeilingDbfs },
    voicesCount: result.voices.length,
    placementsCount: placements.length,
    lullFrames: result.rainPlan.lull,
    wallaLines: walla.lines,
  };
  writeFileSync(
    join(out, "measurements.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  writeFileSync(
    join(out, "placements.json"),
    JSON.stringify(
      placements.map((p) => ({
        ...p,
        errorSamples: p.alignedSample - sample(p.frame),
      })),
      null,
      2,
    ) + "\n",
  );
  console.log(
    `混音 ${out}/mix.wav，${after.integratedLufs} LUFS，${after.truePeakDbtp} dBTP，限幅 ${maximumReductionDb.toFixed(2)} dB。${placements.length} 次落位，${report.voicesCount} 颗乐音。`,
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

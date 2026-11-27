/**
 * 《雨后》的雨（#202）：按 sound-design.md「雨声要像真的」分八条纯代码合成的层——远处雨幕（成形噪声，左右去相关，随阵风成片起伏）、
 * 按表面分的近处撞击（瓦顶、檐廊木板、树篱叶子、竹竿；泊松过程，每下的大小、音色、声像都不同）、落在水洼上的气泡声（Minnaert 共振的上滑短音）、
 * 檐口流水（每条瓦沟一股，粗细 flow、断续 continuity 各不相同）和雨尾声里最后停的大水滴。
 * 雨量按场次取自时间表（open 所在镜头约 160%，下一镜 140% → 100%，rain_tail 所在镜头接小样 S1 的 rainAmount），阵风低谷跟着 thunder 事件走；
 * 雨停的顺序是远处先停、近处后停、大水滴最后停。供 render.ts 调用，各层可单独导出试听。
 * 各层的混音电平以雨量 100%、无阵风时的 3 秒参考段（reference）的 RMS 计，见 render.ts 的 rainMixDb 与 RAIN_RMS_DBFS。
 * 远处雨幕用第 1–2 镜 weather.ts 的雨带噪声在画面中心取样，叠加近处阵风与雷后的短暂低谷。
 */
import {
  DURATION as SAMPLE_RAIN_DURATION,
  rainAmount as sampleRainAmount,
} from "../../pure-code-sample/shots/s1/timing.ts";
import {
  curve,
  place,
  random,
  rate,
  seedFor,
  stereo,
} from "../../../src/kit/sound/dsp.ts";
import { noise1 } from "../../../src/kit/engine/random.ts";
import type { EventTable, Stereo } from "../../../src/kit/sound/types.ts";

export type RainLayer =
  | "curtain"
  | "tile"
  | "wood"
  | "leaves"
  | "bamboo"
  | "puddles"
  | "gutters"
  | "lastDrops";
export const RAIN_LAYERS: readonly RainLayer[] = [
  "curtain",
  "tile",
  "wood",
  "leaves",
  "bamboo",
  "puddles",
  "gutters",
  "lastDrops",
];

export const FIRST_SHOT_RAIN = 1.6;
export const SECOND_SHOT_RAIN: readonly [number, number] = [1.4, 1];
export const LULL_AFTER_THUNDER_SECONDS = 0.9;
export const LULL_SECONDS = 1.0;
export const LULL_DB = -4;

export type RainPlan = {
  fromFrame: number;
  toFrame: number;
  amount: (frame: number) => number;
  gustDb: (frame: number) => number;
  lull: { fromFrame: number; toFrame: number };
};

const shotOf = (table: EventTable, id: string) => {
  const index = table.shotTable.findIndex((shot) => shot.id === id);
  const row = table.shotTable[index];
  if (!row) throw new Error(`时间表里没有镜头：${id}`);
  return {
    index,
    from: row.startFrame,
    to: row.startFrame + row.durationInFrames,
  };
};

export const rainPlan = (table: EventTable, seed: number): RainPlan => {
  const open = table.events.find((event) => event.kind === "open");
  const tail = table.events.find((event) => event.kind === "rain_tail");
  const thunder = table.events.find((event) => event.kind === "thunder");
  if (!open || !tail)
    throw new Error("雨的时间需要 open 和 rain_tail 两个画面事件。");
  const first = shotOf(table, open.shotId);
  const second = table.shotTable[first.index + 1];
  if (!second || tail.frame < second.startFrame + second.durationInFrames)
    throw new Error(
      `雨尾事件应在 open 所在镜头的下两镜（${table.shotTable[first.index + 2]?.id ?? "无"}），实际在 ${tail.shotId}。`,
    );
  const secondRange = {
    from: second.startFrame,
    to: second.startFrame + second.durationInFrames,
  };
  const fps = table.fps;
  const amount = (frame: number) => {
    if (frame < open.frame) return 0;
    if (frame < first.to)
      return curve(
        [
          [open.frame + (first.to - open.frame) * 0.75, FIRST_SHOT_RAIN],
          [first.to - 1, SECOND_SHOT_RAIN[0]],
        ],
        frame,
      );
    if (frame < secondRange.to)
      return curve(
        [
          [secondRange.from, SECOND_SHOT_RAIN[0]],
          [secondRange.to, SECOND_SHOT_RAIN[1]],
        ],
        frame,
      );
    return SECOND_SHOT_RAIN[1] * sampleRainAmount(frame - tail.frame);
  };
  const rng = random(seedFor(seed, "gust"));
  const waves = Array.from({ length: 4 }, (_, k) => ({
    hz: 1 / (2.1 + k * 0.55),
    phase: rng() * Math.PI * 2,
    weight: 0.42 - k * 0.07,
  }));
  const lullCenter = thunder
    ? thunder.frame + LULL_AFTER_THUNDER_SECONDS * fps
    : -1;
  const lull = {
    fromFrame: lullCenter - (LULL_SECONDS / 2) * fps,
    toFrame: lullCenter + (LULL_SECONDS / 2) * fps,
  };
  const gustDb = (frame: number) => {
    const t = frame / fps;
    let modulation = 0;
    for (const wave of waves)
      modulation +=
        wave.weight * Math.sin(2 * Math.PI * wave.hz * t + wave.phase);
    const gain = Math.max(0.08, 1 + modulation * 0.95);
    const dip =
      lullCenter < 0
        ? 0
        : curve(
            [
              [lull.fromFrame, 0],
              [lullCenter, LULL_DB],
              [lull.toFrame, 0],
            ],
            frame,
          );
    const close = frame >= secondRange.from;
    const local = frame - (close ? secondRange.from : first.from);
    const rainBand = noise1(960 / 580 - (close ? -local : local) / 65, 187);
    return 20 * Math.log10(gain) + dip + (rainBand - 0.5) * 2;
  };
  return {
    fromFrame: open.frame,
    toFrame: tail.frame + SAMPLE_RAIN_DURATION,
    amount,
    gustDb,
    lull,
  };
};

const IMPACT_SECONDS = 0.2;

type Surface = {
  pan: number;
  panJitter: number;
  perSecond: number;
  amountPower: number;
  size: [floor: number, shape: number];
  gust: number;
  render: (
    out: Float64Array,
    start: number,
    gain: number,
    rng: () => number,
  ) => void;
};

export const MINNAERT_HZ_PER_METRE = 3.26;

export const surfaces: Record<
  "tile" | "wood" | "leaves" | "bamboo" | "puddles" | "lastDrops",
  Surface
> = {
  tile: {
    pan: 0.28,
    panJitter: 0.3,
    perSecond: 130,
    amountPower: 1.3,
    size: [0.22, 2.2],
    gust: 0.55,
    render: (out, start, gain, rng) => {
      const modes = 2 + Math.floor(rng() * 3);
      for (let k = 0; k < modes; k++)
        decayingTone(
          out,
          start,
          2000 + rng() * 3000,
          150 + rng() * 260,
          gain * (0.25 + 0.3 * rng()),
          0,
          0.0003,
        );
      bandBurst(
        out,
        start,
        0.0012 + rng() * 0.0018,
        gain * 0.8,
        rng,
        1500,
        9000,
      );
    },
  },
  wood: {
    pan: 0.18,
    panJitter: 0.22,
    perSecond: 48,
    amountPower: 1.2,
    size: [0.2, 2],
    gust: 0.55,
    render: (out, start, gain, rng) => {
      decayingTone(
        out,
        start,
        280 + rng() * 620,
        110 + rng() * 120,
        gain,
        0,
        0.0006,
      );
      decayingTone(
        out,
        start,
        145 + rng() * 210,
        85 + rng() * 70,
        gain * 1.6,
        0,
        0.0008,
      );
      bandBurst(out, start, 0.004 + rng() * 0.004, gain * 0.45, rng, 250, 2500);
    },
  },
  leaves: {
    pan: -0.42,
    panJitter: 0.3,
    perSecond: 260,
    amountPower: 1.25,
    size: [0.12, 1.6],
    gust: 0.55,
    render: (out, start, gain, rng) => {
      const ticks = 3 + Math.floor(rng() * 5);
      for (let k = 0; k < ticks; k++)
        bandBurst(
          out,
          start + Math.round(rng() * 0.03 * rate),
          0.002 + rng() * 0.004,
          gain * (0.3 + 0.25 * rng()),
          rng,
          2000,
          8000,
        );
    },
  },
  bamboo: {
    pan: 0.24,
    panJitter: 0.08,
    perSecond: 46,
    amountPower: 1.15,
    size: [0.3, 1.8],
    gust: 0.55,
    render: (out, start, gain, rng) => {
      decayingTone(
        out,
        start,
        620 + rng() * 560,
        70 + rng() * 60,
        gain * 0.6,
        0,
        0.0003,
      );
      decayingTone(
        out,
        start,
        2300 + rng() * 1600,
        420,
        gain * 0.35,
        0,
        0.00012,
      );
      bandBurst(out, start, 0.001, gain * 0.3, rng, 800, 8000);
    },
  },
  puddles: {
    pan: 0,
    panJitter: 0.5,
    perSecond: 30,
    amountPower: 0.75,
    size: [0.25, 1.5],
    gust: 0.4,
    render: (out, start, gain, rng) => {
      const radiusMm = 0.75 + rng() * 3.2;
      const hz = MINNAERT_HZ_PER_METRE / (radiusMm / 1000);
      decayingTone(
        out,
        start + Math.round(0.003 * rate),
        hz,
        60 + 420 * rng(),
        gain * 0.8,
        hz * (0.4 + 0.4 * rng()),
        0.002,
      );
    },
  },
  lastDrops: {
    pan: -0.1,
    panJitter: 0.5,
    perSecond: 1.6,
    amountPower: 0.45,
    size: [0.4, 1],
    gust: 0.4,
    render: (out, start, gain, rng) => {
      const hz = 380 + rng() * 500;
      decayingTone(out, start, hz, 38 + rng() * 30, gain, -hz * 0.2, 0.0006);
      bandBurst(out, start, 0.006, gain * 0.5, rng, 300, 3000);
    },
  },
};

export const gutterStreams: readonly {
  pan: number;
  gain: number;
  flow: number;
  continuity: number;
}[] = [
  { pan: -0.4, gain: 1, flow: 1.7, continuity: 0.5 },
  { pan: 0.3, gain: 0.6, flow: 1.1, continuity: 0.3 },
  { pan: 0.12, gain: 0.5, flow: 0.9, continuity: 0.2 },
  { pan: 0.38, gain: 0.42, flow: 1.3, continuity: 0.42 },
];

const onePole = (cutoffHz: number) =>
  1 - Math.exp((-2 * Math.PI * cutoffHz) / rate);

export const curtainShapes: readonly {
  edges: number[];
  weights: number[];
  air: number[];
}[] = [
  {
    edges: [60, 220, 500, 1000, 2000, 4000, 8000, 16000, 23000].map(onePole),
    weights: [1.05, 0.7, 0.54, 0.74, 0.9, 1, 0.45, 0.1],
    air: [onePole(9000), onePole(9000)],
  },
  {
    edges: [58, 210, 480, 960, 1900, 3800, 7600, 15000, 22000].map(onePole),
    weights: [1.05, 0.7, 0.54, 0.74, 0.9, 1, 0.45, 0.1],
    air: [onePole(8600), onePole(8600)],
  },
];

const poisson = (
  seconds: number,
  perSecond: (t: number) => number,
  rng: () => number,
) => {
  const times: number[] = [];
  let t = 0;
  for (;;) {
    t += -Math.log(1 - rng()) / Math.max(0.05, perSecond(t));
    if (t >= seconds) break;
    times.push(t);
  }
  return times;
};

const decayingTone = (
  out: Float64Array,
  start: number,
  hz: number,
  decay: number,
  gain: number,
  sweep: number,
  attack: number,
) => {
  let phase = 0;
  const last = Math.min(out.length, start + Math.ceil((7 / decay) * rate));
  for (let i = Math.max(0, start); i < last; i++) {
    const dt = (i - start) / rate;
    const f = hz + sweep * Math.exp(-dt * decay * 2.2);
    phase += (2 * Math.PI * f) / rate;
    out[i] +=
      Math.sin(phase) * Math.exp(-dt * decay) * Math.min(1, dt / attack) * gain;
  }
};

const bandBurst = (
  out: Float64Array,
  start: number,
  seconds: number,
  gain: number,
  rng: () => number,
  lowHz: number,
  highHz: number,
) => {
  const last = Math.min(out.length, start + Math.ceil(seconds * rate));
  const low = onePole(lowHz);
  const high = onePole(highHz);
  let lowState = 0;
  let bandState = 0;
  for (let i = Math.max(0, start); i < last; i++) {
    const dt = (i - start) / rate;
    const white = rng() * 2 - 1;
    lowState += low * (white - lowState);
    bandState += high * (white - lowState - bandState);
    out[i] += bandState * Math.exp((-dt * 6) / seconds) * gain;
  }
};

export type RainRender = {
  fromSample: number;
  length: number;
  layers: Record<RainLayer, Stereo>;
  plan: RainPlan;
  hits: Record<RainLayer, number>;
};

export const REFERENCE_SECONDS = 3;

export const synthesizeRain = (
  table: EventTable,
  seed: number,
  toSample: (frame: number) => number,
  reference = false,
): RainRender => {
  const plan = rainPlan(table, seed);
  const fromSample = reference ? 0 : toSample(plan.fromFrame);
  const seconds = reference
    ? REFERENCE_SECONDS
    : (toSample(plan.toFrame) - fromSample) / rate + 2;
  const n = Math.ceil(seconds * rate);
  const fps = table.fps;
  const frameAt = (t: number) =>
    Math.min(plan.toFrame - 1, t * fps + plan.fromFrame);
  const amountAt = reference ? () => 1 : (t: number) => plan.amount(frameAt(t));
  const gustAt = reference ? () => 0 : (t: number) => plan.gustDb(frameAt(t));
  const second = table.shotTable[1];
  const view = (t: number) =>
    reference
      ? 0
      : curve(
          [
            [second.startFrame - 1, 0],
            [second.startFrame + 1, 1],
            [second.startFrame + second.durationInFrames, 1],
            [second.startFrame + second.durationInFrames + 2, 0],
          ],
          frameAt(t),
        );
  const layers = Object.fromEntries(
    RAIN_LAYERS.map((layer) => [layer, stereo(n)]),
  ) as Record<RainLayer, Stereo>;
  const hits = Object.fromEntries(
    RAIN_LAYERS.map((layer) => [layer, 0]),
  ) as Record<RainLayer, number>;

  for (const [c, shape] of curtainShapes.entries()) {
    const rng = random(seedFor(seed, `curtain/${c}`));
    const out = layers.curtain[c];
    const low = new Float64Array(shape.edges.length);
    const air = new Float64Array(shape.air.length);
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      const amount = amountAt(t);
      if (amount <= 0) continue;
      const white = rng() * 2 - 1;
      let value = 0;
      for (const [k, edge] of shape.edges.entries())
        low[k] += edge * (white - low[k]);
      for (const [k, weight] of shape.weights.entries())
        value += weight * (low[k] - low[k + 1]);
      for (const [k, alpha] of shape.air.entries()) {
        air[k] += alpha * (value - air[k]);
        value = air[k];
      }
      out[i] = value * amount ** 1.7 * 10 ** ((gustAt(t) - 3 * view(t)) / 20);
    }
  }

  const scatter = (
    name: Exclude<RainLayer, "curtain" | "gutters">,
    surface: Surface,
  ) => {
    const rng = random(seedFor(seed, name));
    const bus = layers[name];
    for (const at of poisson(
      seconds,
      (t) => surface.perSecond * amountAt(t) ** surface.amountPower,
      rng,
    )) {
      const size =
        surface.size[0] + (1 - surface.size[0]) * rng() ** surface.size[1];
      const closeDb = name === "bamboo" || name === "wood" ? 3 * view(at) : 0;
      const roofTail = name === "tile" ? Math.min(1, amountAt(at)) ** 0.45 : 1;
      const gain = size * roofTail * 10 ** ((gustAt(at) * surface.gust + closeDb) / 20);
      const voice = new Float64Array(Math.ceil(IMPACT_SECONDS * rate));
      surface.render(voice, 0, gain, rng);
      const pan = Math.max(
        -1,
        Math.min(1, surface.pan + (rng() * 2 - 1) * surface.panJitter),
      );
      place(
        bus,
        { samples: voice, alignmentSample: 0 },
        Math.round(at * rate),
        1,
        pan,
        0.3,
      );
      hits[name] += 1;
    }
  };
  scatter("tile", surfaces.tile);
  scatter("wood", surfaces.wood);
  scatter("leaves", surfaces.leaves);
  scatter("bamboo", surfaces.bamboo);
  scatter("puddles", surfaces.puddles);
  scatter("lastDrops", surfaces.lastDrops);

  gutterStreams.forEach((stream, k) => {
    const rng = random(seedFor(seed, `gutters/${k}`));
    const out = new Float64Array(n);
    const low = onePole(700);
    const high = onePole(8000);
    let lowState = 0;
    let bandState = 0;
    let slow = 0;
    const blobs = new Set(
      poisson(seconds, (t) => 9 * stream.flow * amountAt(t), rng).map((at) =>
        Math.round(at * rate),
      ),
    );
    for (let i = 0; i < n; i++) {
      const t = i / rate;
      const amount = amountAt(t);
      if (amount <= 0) continue;
      const white = rng() * 2 - 1;
      lowState += low * (white - lowState);
      bandState += high * (white - lowState - bandState);
      slow += 0.0045 * (white - slow);
      const continuous = Math.max(
        0,
        1 - 2.4 * Math.abs(slow) * (1.6 - stream.continuity),
      );
      if (blobs.has(i)) bandBurst(out, i, 0.012, 0.5 + rng(), rng, 1000, 6000);
      out[i] +=
        bandState *
        (0.7 + 0.6 * stream.continuity) *
        amount ** 0.9 *
        (0.5 + 0.5 * continuous) *
        10 ** ((gustAt(t) * 0.5 + (k === 0 ? 3 * view(t) : 0)) / 20);
      if (blobs.has(i)) hits.gutters += 1;
    }
    place(
      layers.gutters,
      { samples: out, alignmentSample: 0 },
      0,
      stream.gain,
      stream.pan,
      0.25,
    );
  });

  const edge = Math.round(rate * 0.01);
  for (const layer of RAIN_LAYERS)
    for (const channel of layers[layer])
      for (let i = 0; i < edge && i < channel.length; i++)
        channel[i] *= i / edge;
  return { fromSample, length: n, layers, plan, hits };
};

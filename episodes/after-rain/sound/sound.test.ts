/**
 * 《雨后》雨、屋里的说话与哼唱远近的测试（#202 测试接缝：生成的分层和混音片段，在内存里量）：
 * 1. 雨量曲线按场次取自时间表，第 2 → 3 镜接得上，推迟 rain_tail 事件时雨的范围跟着走，阵风低谷跟着 thunder 事件走；
 * 2. 雨幕是 1–8 kHz 的宽带、左右去相关、低频很少；瓦顶撞击集中在 2–5 kHz；水洼气泡声集中在 0.8–4 kHz；
 * 3. 雨停的顺序：远处先停、近处后停、大水滴最后停；
 * 4. 屋里的说话一问一答不重叠、都在镜头内，隔墙后 1 kHz 以上明显变弱；
 * 5. 哼唱远段比近段低 5–9 dB，且高频占比更小。
 * 测试还在生成的全片混音上核对接触的实际落位、每帧空气床和静默段的新起音；响度、真峰值与断音由 pnpm qa 实测。
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { frameToSample } from "../../../src/kit/shots.ts";
import { rate, seedFor, stereo } from "../../../src/kit/sound/dsp.ts";
import type { Clip, EventTable, Stereo } from "../../../src/kit/sound/types.ts";
import { bandLevels, envelope } from "./analyze.ts";
import { rainAmount as sampleRainAmount } from "../../pure-code-sample/shots/s1/timing.ts";
import { RAIN_LAYERS, rainPlan, surfaces, synthesizeRain } from "./rain.ts";
import { renderHum, renderMix, rmsDbfs, type RawScore } from "./render.ts";
import { renderSpots } from "./spotting.ts";
import { synthesizeHumClip } from "./sfx.ts";
import { synthesizeWalla, wallaLines, wallaViews } from "./walla.ts";

const root = resolve(import.meta.dirname, "../../..");
const table = JSON.parse(
  readFileSync(resolve(root, "episodes/after-rain/data/events.json"), "utf8"),
) as EventTable;
const score = JSON.parse(
  readFileSync(resolve(root, "episodes/after-rain/score.json"), "utf8"),
) as RawScore;
const seed = 185;
const toSample = (frame: number) => frameToSample(frame, rate, table.fps);

const bandsOf = (
  bus: Stereo,
  from: number,
  to: number,
  bands: [number, number][],
) =>
  bandLevels(
    [bus[0].subarray(from, to), bus[1].subarray(from, to)],
    rate,
    0,
    (to - from) / rate,
    bands.map(([low, high]) => ({ low, high })),
  ).bands;

const correlation = (a: Float64Array, b: Float64Array) => {
  let sa = 0,
    sb = 0,
    sab = 0;
  for (let i = 0; i < a.length; i++) {
    sa += a[i] ** 2;
    sb += b[i] ** 2;
    sab += a[i] * b[i];
  }
  return sab / Math.sqrt(sa * sb);
};

test("雨量按场次取自时间表：第 1 镜 160%，第 2 镜 140% → 100%，雨尾镜头接小样的曲线且接得上", () => {
  const plan = rainPlan(table, seed);
  const [first, second, third] = table.shotTable;
  assert.equal(plan.fromFrame, first.startFrame);
  assert.equal(plan.amount(first.startFrame), 1.6);
  assert.equal(plan.amount(first.startFrame + first.durationInFrames - 1), 1.4);
  assert.ok(Math.abs(plan.amount(second.startFrame) - 1.4) < 1e-9);
  assert.ok(
    Math.abs(plan.amount(second.startFrame + second.durationInFrames - 1) - 1) <
      0.01,
  );
  const tail = table.events.find((event) => event.kind === "rain_tail")!;
  assert.equal(tail.shotId, third.id);
  for (const frame of [
    third.startFrame,
    third.startFrame + 30,
    third.startFrame + 88,
  ])
    assert.ok(
      Math.abs(plan.amount(frame) - sampleRainAmount(frame - tail.frame)) <
        1e-9,
      `第 ${frame} 帧雨量接小样曲线`,
    );
  assert.equal(plan.amount(third.startFrame + 200), 0);
  assert.equal(plan.toFrame, tail.frame + 168);
});

test("包络步长不能舍入到零个采样，单采样窗口能前进", () => {
  const channel = Float64Array.of(1, 0.5);
  assert.throws(() => envelope(channel, rate, 1e-6, 0, 2 / rate), /--step/);
  assert.deepEqual(envelope(channel, rate, 1 / rate, 0, 2 / rate), [0, 10 * Math.log10(0.25)]);
});

test("在首镜内把 open 推迟到 F12，大雨从事件帧开始", () => {
  const events = table.events.map((e) => e.kind === "open" ? { ...e, frame: 12, localFrame: 12 } : e);
  const plan = rainPlan({ ...table, events }, seed);
  assert.equal(plan.fromFrame, 12);
  assert.equal(plan.amount(11), 0);
  assert.equal(plan.amount(12), 1.6);
});

test("一声同伴回应连同混响按全片采样淡出，在叠化末帧起点归零", () => {
  const anchors = ["drip_fall", "drip_hit", "hush", "drop", "toe_turn"];
  const call = table.events.filter((e) => e.kind === "companion_call").at(-1)!;
  const events = [...table.events.filter((e) => anchors.includes(e.kind)), call];
  const start = table.shotTable.find((r) => r.id === "s12")!.startFrame;
  const last = table.shotTable.find((r) => r.id === "s11")!;
  const end = last.startFrame + last.durationInFrames - 1;
  const render = (delayDissolve: number) => {
    const shotTable = table.shotTable.map((r) => {
      if (r.id === "s12") return { ...r, startFrame: r.startFrame + delayDissolve };
      if (r.id === "s11") return { ...r, durationInFrames: r.durationInFrames + delayDissolve };
      return r;
    });
    const nearCall = (f: number) => toSample(f - call.frame + 1);
    const length = nearCall(end + 4);
    const stems = { ambience: stereo(length), sfx: stereo(length), voice: stereo(length) };
    renderSpots({ ...table, shotTable, events }, seed, nearCall, stems);
    return stems.sfx;
  };
  const faded = render(0);
  const full = render(last.durationInFrames);
  const at = (frame: number) => toSample(frame - call.frame + 1);
  for (const c of [0, 1]) {
    assert.ok(full[c].subarray(at(call.frame), at(end)).some((x) => x !== 0));
    assert.ok(full[c].subarray(at(end)).some((x) => x !== 0), "对照声在末帧仍有混响");
    for (let i = at(call.frame); i < faded[c].length; i++) {
      const gain = Math.max(0, (at(end) - i) / (at(end) - at(start)));
      assert.ok(Math.abs(faded[c][i] - full[c][i] * gain) < 1e-12);
    }
  }
});

test("推迟 rain_tail 事件时雨的范围跟着事件走；阵风低谷在 thunder 事件之后", () => {
  const plan = rainPlan(table, seed);
  const shifted = rainPlan(
    {
      ...table,
      events: table.events.map((event) =>
        event.kind === "rain_tail"
          ? {
              ...event,
              frame: event.frame + 4,
              localFrame: event.localFrame + 4,
            }
          : event,
      ),
    },
    seed,
  );
  assert.equal(shifted.toFrame, plan.toFrame + 4);
  assert.equal(shifted.fromFrame, plan.fromFrame);

  const thunder = table.events.find((event) => event.kind === "thunder")!;
  const center = Math.round((plan.lull.fromFrame + plan.lull.toFrame) / 2);
  assert.ok(center > thunder.frame + 12, "低谷在雷声之后");
  assert.ok(
    plan.gustDb(center) <= -3,
    `低谷中心 ${plan.gustDb(center).toFixed(1)} dB`,
  );
  const before = plan.gustDb(thunder.frame - 30);
  assert.ok(before > -3.5, `雷声前的阵风 ${before.toFixed(1)} dB 不在低谷里`);
});

test("雨幕是 1–8 kHz 的宽带、左右去相关、低频很少；瓦顶撞击集中在 2–5 kHz，水洼气泡声集中在 0.8–4 kHz", () => {
  const rain = synthesizeRain(table, seed, toSample, true);
  const n = rain.length;
  const curtain = bandsOf(rain.layers.curtain, 0, n, [
    [20, 200],
    [300, 1000],
    [1000, 8000],
  ]);
  assert.ok(
    curtain["1000-8000"] - curtain["300-1000"] >= 6,
    `雨幕 1–8 kHz 比 300–1000 Hz 高 ${(curtain["1000-8000"] - curtain["300-1000"]).toFixed(1)} dB`,
  );
  assert.ok(curtain["20-200"] < curtain["1000-8000"] - 12, "雨幕几乎没有低频");
  assert.ok(
    Math.abs(correlation(rain.layers.curtain[0], rain.layers.curtain[1])) < 0.2,
    "雨幕左右去相关",
  );
  const tile = bandsOf(rain.layers.tile, 0, n, [
    [20, 2000],
    [2000, 5000],
    [5000, 24000],
  ]);
  assert.ok(
    tile["2000-5000"] > tile["20-2000"] + 8 &&
      tile["2000-5000"] > tile["5000-24000"] + 8,
    "瓦顶撞击在 2–5 kHz",
  );
  const puddles = bandsOf(rain.layers.puddles, 0, n, [
    [20, 800],
    [800, 4000],
    [4000, 24000],
  ]);
  assert.ok(
    puddles["800-4000"] > puddles["20-800"] + 10 &&
      puddles["800-4000"] > puddles["4000-24000"] + 6,
    "气泡声在 0.8–4 kHz",
  );
  for (const layer of RAIN_LAYERS)
    for (const channel of rain.layers[layer])
      for (const value of channel)
        assert.ok(Number.isFinite(value), `${layer} 层采样有限`);
});

test("雨停的顺序：远处先停、近处后停、大水滴最后停", () => {
  const powers = {
    curtain: 1.7,
    tile: surfaces.tile.amountPower,
    puddles: surfaces.puddles.amountPower,
    lastDrops: surfaces.lastDrops.amountPower,
  };
  assert.ok(
    powers.curtain > powers.tile &&
      powers.tile > powers.puddles &&
      powers.puddles > powers.lastDrops,
    "各层对雨量的幂次从远到近递减",
  );
  const rain = synthesizeRain(table, seed, toSample);
  const plan = rain.plan;
  const second = table.shotTable[1];
  const tail = table.events.find((event) => event.kind === "rain_tail")!;
  const loud = [
    toSample(second.startFrame + second.durationInFrames - 48) -
      rain.fromSample,
    toSample(second.startFrame + second.durationInFrames) - rain.fromSample,
  ];
  const late = [
    toSample(tail.frame + 40) - rain.fromSample,
    toSample(tail.frame + 88) - rain.fromSample,
  ];
  const drop = (layer: "curtain" | "tile" | "puddles") =>
    rmsDbfs(rain.layers[layer], loud[0], loud[1]) -
    rmsDbfs(rain.layers[layer], late[0], late[1]);
  const order = {
    curtain: drop("curtain"),
    tile: drop("tile"),
    puddles: drop("puddles"),
  };
  assert.ok(
    order.curtain > order.tile + 3,
    `雨量降到约 ${plan.amount(tail.frame + 60).toFixed(2)} 时：雨幕降 ${order.curtain.toFixed(1)} dB，瓦顶降 ${order.tile.toFixed(1)} dB`,
  );
  assert.ok(
    order.tile > order.puddles,
    `瓦顶降 ${order.tile.toFixed(1)} dB，气泡降 ${order.puddles.toFixed(1)} dB`,
  );
  const afterTail = rmsDbfs(
    rain.layers.lastDrops,
    toSample(tail.frame + 88) - rain.fromSample,
    rain.length,
  );
  assert.ok(
    Number.isFinite(afterTail) && afterTail > -90,
    `雨量归零后大水滴还在响（${afterTail.toFixed(1)} dBFS）`,
  );
  assert.ok(
    rmsDbfs(
      rain.layers.curtain,
      toSample(tail.frame + 88) - rain.fromSample,
      rain.length,
    ) < -120,
    "雨量归零后雨幕停了",
  );
});

test("屋里的说话一问一答不重叠、都在镜头内，雷后那句从阵风低谷起；隔墙后 1 kHz 以上明显变弱", () => {
  const count = toSample(table.shotTable[3].startFrame);
  const walla = synthesizeWalla(table, seed, count, toSample);
  const [first, second] = walla.shots;
  const firstSeconds = (first.to - first.from) / table.fps;
  const secondSeconds = (second.to - second.from) / table.fps;
  const lines = walla.lines;
  assert.equal(lines.length, wallaLines.length);
  for (const [i, line] of lines.entries()) {
    const limit = line.shot === 0 ? firstSeconds : secondSeconds - 1.2;
    assert.ok(
      line.at >= 0 && line.at + line.seconds <= limit,
      `${line.slot} 在镜头内：${line.at.toFixed(2)}–${(line.at + line.seconds).toFixed(2)} 秒`,
    );
    if (i > 0 && lines[i - 1].shot === line.shot && line.slot !== "laugh")
      assert.ok(
        line.at >= lines[i - 1].at + lines[i - 1].seconds,
        `${line.slot} 接在上一句之后`,
      );
  }
  const plan = rainPlan(table, seed);
  const lull = lines.find((line) => line.slot === "lull")!;
  assert.ok(
    Math.abs(lull.at - (plan.lull.fromFrame - first.from) / table.fps) < 1e-9,
    "雷后那句从阵风低谷起",
  );
  const laugh = lines.find((line) => line.slot === "laugh")!;
  assert.ok(
    laugh.at < lull.at + lull.seconds &&
      laugh.at + laugh.seconds <= firstSeconds,
    "轻笑接在那句的尾巴上，不越过切点",
  );

  const from = toSample(first.from) + Math.round(lines[1].at * rate);
  const to = from + Math.round(lines[1].seconds * rate);
  const dry = bandsOf(walla.output, from, to, [
    [300, 1000],
    [1000, 24000],
  ]);
  assert.ok(
    dry["300-1000"] - dry["1000-24000"] > 20,
    `隔墙后 300–1000 Hz 比 1 kHz 以上高 ${(dry["300-1000"] - dry["1000-24000"]).toFixed(1)} dB`,
  );
  assert.ok(
    wallaViews[1].cutoffHz < wallaViews[0].cutoffHz && wallaViews[1].db < 0,
    "第 2 镜更闷、更轻",
  );
});

test("哼唱远段比近段低 5–9 dB，高频占比更小，近段在 hum_start 所在镜头内；按 score.json 的 hum 乐句合成时前景比环境轨高至少 6 dB", () => {
  const humEvent = table.events.find((event) => event.kind === "hum_start")!;
  const shot = table.shotTable.find((row) => row.id === humEvent.shotId)!;
  const next = table.shotTable.find(
    (row) => row.startFrame === shot.startFrame + shot.durationInFrames,
  )!;
  const count = toSample(next.startFrame + next.durationInFrames);
  const ambience = stereo(count);
  for (let i = 0; i < count; i++) {
    ambience[0][i] = Math.sin(i * 0.001) * 0.01;
    ambience[1][i] = Math.cos(i * 0.0013) * 0.01;
  }
  const steady: Clip = {
    samples: Float64Array.from({ length: Math.round(10 * rate) }, (_, i) =>
      Array.from({ length: 16 }, (_, k) => 1 / (k + 1)).reduce(
        (sum, weight, k) =>
          sum + weight * Math.sin((2 * Math.PI * 262 * (k + 1) * i) / rate),
        0,
      ),
    ),
    alignmentSample: 0,
  };
  const hum = renderHum(table, steady, count, toSample, (from, to) =>
    rmsDbfs(ambience, from, to),
  );
  assert.equal(hum.near.from, toSample(humEvent.frame));
  assert.ok(
    hum.near.from >= toSample(shot.startFrame) &&
      hum.near.to <= toSample(shot.startFrame + shot.durationInFrames),
    "近段在 hum_start 所在镜头内",
  );
  assert.equal(hum.far.to, count);
  const near = rmsDbfs(hum.output, hum.near.from, hum.near.to);
  const far = rmsDbfs(hum.output, hum.far.to - rate, hum.far.to);
  assert.ok(
    near - far >= 5 && near - far <= 9,
    `远段最后 1 秒比近段低 ${(near - far).toFixed(1)} dB`,
  );
  const nearBands = bandsOf(hum.output, hum.near.from, hum.near.to, [
    [20, 2500],
    [2500, 24000],
  ]);
  const farBands = bandsOf(hum.output, hum.far.to - rate, hum.far.to, [
    [20, 2500],
    [2500, 24000],
  ]);
  assert.ok(
    farBands["2500-24000"] - farBands["20-2500"] <
      nearBands["2500-24000"] - nearBands["20-2500"] - 6,
    "远段末 2.5 kHz 以上比近段少 6 dB 以上",
  );

  const sung = renderHum(
    table,
    synthesizeHumClip(score, seedFor(seed, "hum")),
    count,
    toSample,
    (from, to) => rmsDbfs(ambience, from, to),
  );
  const shotEnd = toSample(shot.startFrame + shot.durationInFrames);
  assert.ok(
    sung.output[0].some((value) => Math.abs(value) > 0.001),
    "按乐谱合成的哼唱有声",
  );
  const above =
    rmsDbfs(sung.output, sung.near.from, shotEnd) -
    rmsDbfs(ambience, sung.near.from, shotEnd);
  assert.ok(
    above >= 6 && above <= 10,
    `近段到镜头末比环境轨高 ${above.toFixed(1)} dB`,
  );
});

test("全片混音：逐个接触对齐画面采样，空气床和混音逐帧有声，静默处不触发新音", () => {
  const { placements, mix, air, voices, stems } = renderMix(table, score, seed);
  const other = [
    "open",
    "lightning",
    "rain_tail",
    "light_break",
    "drip_fall",
    "hush",
    "drop",
    "hum_start",
    "look_up",
    "lamp_on",
    "fade_out",
  ];
  for (const ev of table.events) {
    const cues = placements.filter(
      (p) =>
        p.shotId === ev.shotId && p.kind === ev.kind && p.frame === ev.frame,
    );
    assert.equal(
      cues.length,
      other.includes(ev.kind) ? 0 : 1,
      `${ev.shotId} ${ev.kind} ${ev.frame}`,
    );
    for (const p of cues)
      assert.equal(p.startSample + p.alignmentSample, toSample(ev.frame));
  }
  for (let f = 0; toSample(f) < mix[0].length; f++) {
    const a = toSample(f),
      b = toSample(f + 1);
    assert.ok(
      rmsDbfs(air, a, b) > -90 && rmsDbfs(mix, a, b) > -90,
      `第 ${f} 帧应有底噪`,
    );
    for (const c of [0, 1])
      assert.ok(
        Math.abs(
          mix[c][a] -
            (stems.ambience[c][a] + stems.sfx[c][a] + stems.music[c][a]),
        ) < 1e-12,
        "三轨之和即成片",
      );
  }
  const eventFrame = (kind: string) =>
    table.events.find((e) => e.kind === kind)!.frame;
  const sun = table.shotTable.find((shot) => shot.id === "s08")!;
  const turns = table.events.filter((e) => e.kind === "toe_turn");
  const intervals = [
    [eventFrame("drip_fall"), eventFrame("drip_hit")],
    [eventFrame("hush"), eventFrame("drop") + 1],
    [turns[1].frame + 2, turns[2].frame - 1],
    [sun.startFrame, sun.startFrame + sun.durationInFrames],
  ];
  for (const [from, to] of intervals) {
    const inside = (i: number) => i >= toSample(from) && i < toSample(to);
    assert.ok(
      !voices.some((v) => inside(v.start)),
      `静默 ${from}–${to} 有新乐音`,
    );
    const starts = placements.filter((p) => inside(p.onsetSample));
    assert.deepEqual(
      starts.map((p) => p.kind),
      from === sun.startFrame ? ["eave_drip", "eave_drip"] : [],
    );
  }
});

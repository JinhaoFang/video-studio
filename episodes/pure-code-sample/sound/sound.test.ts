/** #158/#162 外部行为测试：实谱/夹具、采样对齐、确定性与失败反例；弦乐用基频复解调、100 ms Hann 低通和 200 Hz 相位差测揉弦，取起音后至 0.7 秒避开四人长时拍频，频率容差 0.3 Hz、跨音高 0.6 Hz，并检查幅度排除无揉弦信号。 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { frameToSample } from "../model.ts";
import { hottest100ms, pcmWav, place, rate, stereo } from "./dsp.ts";
import { renderMix } from "./mix.ts";
import { master } from "./measure.ts";
import {
  compileScore,
  frequency,
  resolveAnchor,
  synthesizeNote,
} from "./score.ts";
import { synthesizeSfx } from "./sfx.ts";
import type { EventTable, Score, SfxName, SoundDesign } from "./types.ts";

const load = <T>(file: string): T =>
  JSON.parse(readFileSync(new URL(file, import.meta.url), "utf8"));
const table = load<EventTable>("events.fixture.json");
const score = load<Score>("../score.json");
const design = load<SoundDesign>("../sound.json");
const digest = (data: Uint8Array) =>
  createHash("sha256").update(data).digest("hex");
const measureVibrato = (samples: Float64Array, fundamental: number) => {
  const size = Math.round(rate * 0.1),
    hop = Math.round(rate / 200);
  const real = new Float64Array(samples.length),
    imag = new Float64Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const phase = (2 * Math.PI * fundamental * i) / rate;
    real[i] = samples[i] * Math.cos(phase);
    imag[i] = samples[i] * Math.sin(phase);
  }
  const window = Float64Array.from(
    { length: size },
    (_, i) => 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (size - 1)),
  );
  const cents: number[] = [];
  let previous: number | undefined;
  for (
    let start = Math.round(rate * 0.2);
    start + size < samples.length - rate * 0.1;
    start += hop
  ) {
    let re = 0,
      im = 0;
    for (let i = 0; i < size; i++) {
      re += real[start + i] * window[i];
      im += imag[start + i] * window[i];
    }
    const phase = Math.atan2(im, re);
    if (previous !== undefined) {
      const delta = Math.atan2(
        Math.sin(phase - previous),
        Math.cos(phase - previous),
      );
      const hz = fundamental - (delta * rate) / hop / (2 * Math.PI);
      cents.push(1200 * Math.log2(hz / fundamental));
    }
    previous = phase;
  }
  const mean = cents.reduce((sum, value) => sum + value, 0) / cents.length;
  let best = { hz: 0, amplitudeCents: 0 };
  for (let hz = 2; hz <= 10; hz += 0.01) {
    let re = 0,
      im = 0,
      weight = 0;
    for (let i = 0; i < cents.length; i++) {
      const w = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (cents.length - 1));
      const phase = (2 * Math.PI * hz * i * hop) / rate;
      re += (cents[i] - mean) * w * Math.cos(phase);
      im += (cents[i] - mean) * w * Math.sin(phase);
      weight += w;
    }
    const amplitudeCents = (2 * Math.hypot(re, im)) / weight;
    if (amplitudeCents > best.amplitudeCents) best = { hz, amplitudeCents };
  }
  return best;
};

for (const seed of [158, 159])
  test(`弦乐 F3/F5 的实际揉弦约 4.7 Hz 且与音高无关，种子 ${seed} 逐采样一致`, (t) => {
    const measured = ["F3", "F5"].map((pitch) => {
      const samples = synthesizeNote("strings_pad", pitch, 0.8, 1, seed);
      const repeat = synthesizeNote("strings_pad", pitch, 0.8, 1, seed);
      assert.equal(
        digest(new Uint8Array(samples.buffer)),
        digest(new Uint8Array(repeat.buffer)),
      );
      return { pitch, ...measureVibrato(samples, frequency(pitch)) };
    });
    t.diagnostic(JSON.stringify(measured));
    for (const row of measured) {
      assert.ok(row.hz >= 4.4 && row.hz <= 5.7, `${row.pitch}: ${row.hz} Hz`);
      assert.ok(row.amplitudeCents > 0.5, `${row.pitch}: 揉弦幅度不足`);
    }
    assert.ok(Math.abs(measured[0].hz - measured[1].hz) < 0.6);
  });

test("非零镜头起点、乱序重复事件取首现，extra 只跟第一次 shake", () => {
  const reversed = { ...table, events: [...table.events].reverse() };
  assert.equal(
    resolveAnchor({ event: "shake", offsetFrames: 3 }, reversed),
    181,
  );
  assert.equal(resolveAnchor({ shot: "S2", frame: 144 }, table), 312);
  const mix = renderMix(reversed, score, design, 158);
  assert.equal(mix.durationFrames, 312);
  assert.equal(mix.mix[0].length, 624000);
  assert.deepEqual(
    mix.placements
      .filter((row) => row.sfx === "water_spray")
      .map((row) => row.eventFrame),
    [181],
  );
  assert.deepEqual(
    mix.placements
      .filter((row) => row.sfx === "pole_creak")
      .map((row) => row.eventFrame),
    [238],
  );
  const wings = mix.placements.filter((row) => row.sfx === "wing_flap");
  assert.deepEqual(
    wings.map((row) => row.db),
    [-12, -15, -18, -21, -24],
  );
  assert.deepEqual(
    wings.map((row) => Math.round(row.pan * 100)),
    [30, 45, 60, 75, 90],
  );
  for (const row of mix.placements)
    assert.equal(
      row.startSample + row.alignmentSample,
      frameToSample(row.eventFrame, rate, 24),
    );
  const musicSilence = frameToSample(202, rate, 24),
    hushEnd = frameToSample(216, rate, 24);
  for (const channel of mix.stems.music)
    assert.ok(
      channel.subarray(musicSilence, hushEnd).every((sample) => sample === 0),
    );
  const peakIn = (from: number, to: number) =>
    Math.max(
      ...mix.stems.music.map((channel) =>
        channel
          .subarray(frameToSample(from, rate, 24), frameToSample(to, rate, 24))
          .reduce((peak, sample) => Math.max(peak, Math.abs(sample)), 0),
      ),
    );
  const pluck = peakIn(190, 193);
  const firstSilent = [...Array(216 - 190).keys()]
    .map((offset) => 190 + offset)
    .find((frame) => peakIn(frame, frame + 1) === 0);
  assert.equal(firstSilent, 202);
  assert.ok(peakIn(firstSilent - 1, firstSilent) < pluck * 0.1);
  for (const channel of mix.stems.music)
    assert.ok(
      channel
        .subarray(frameToSample(144, rate, 24), frameToSample(190, rate, 24))
        .every((sample) => sample === 0),
    );
  for (let i = 0; i < mix.mix[0].length; i += 137)
    for (let c = 0; c < 2; c++)
      assert.equal(
        mix.mix[c][i],
        mix.stems.music[c][i] + mix.stems.sfx[c][i] + mix.stems.ambience[c][i],
      );
});

test("内部对齐点实际落在正确采样，含非整数采样帧率和开头裁边", () => {
  const clip = {
    samples: Float64Array.from([0.1, 0.2, 0.9, 0.3]),
    alignmentSample: 2,
  };
  for (const fps of [24, 29.97]) {
    const bus = stereo(100000);
    const at = frameToSample(48, rate, fps);
    place(bus, clip, at, 1, -1);
    assert.equal(bus[0].indexOf(0.9), at);
    assert.ok(Math.abs(at - (48 * rate) / fps) <= 0.5);
    assert.equal(bus[0][at - 2], 0.1);
  }
  const start = stereo(10);
  place(start, clip, 0, 1, -1);
  assert.equal(start[0][0], 0.9);
  const hit = synthesizeSfx("drip_hit", 158);
  const bus = stereo(rate * 7);
  const target = frameToSample(150, rate, 24);
  place(bus, hit, target, 1, -1);
  assert.equal(bus[0].indexOf(Math.max(...hit.samples)), target);
});

test("同种子完整混音、三分轨和十三音效 WAV 字节一致，换种子确实变化", () => {
  const first = renderMix(table, score, design, 158);
  const second = renderMix(table, score, design, 158);
  const firstMaster = master(first.mix, first.stems, -16, -1);
  const secondMaster = master(second.mix, second.stems, -16, -1);
  assert.equal(
    digest(pcmWav(firstMaster.output)),
    digest(pcmWav(secondMaster.output)),
  );
  for (const name of design.master.stems)
    assert.equal(
      digest(pcmWav(first.stems[name])),
      digest(pcmWav(second.stems[name])),
    );
  for (const name of Object.keys(design.sfx) as SfxName[]) {
    const a = synthesizeSfx(name, 158),
      b = synthesizeSfx(name, 158);
    assert.deepEqual(pcmWav([a.samples]), pcmWav([b.samples]));
    assert.ok(Math.abs(hottest100ms(a.samples) + 18) < 0.01, name);
    assert.ok(
      a.samples.every((value) => Math.abs(value) <= 10 ** (-1.5 / 20)),
      name,
    );
  }
  assert.notEqual(
    digest(pcmWav([synthesizeSfx("feather_shake", 158).samples])),
    digest(pcmWav([synthesizeSfx("feather_shake", 159).samples])),
  );
});

test("反例：锚点事件缺失必须报出种类，不能静默跳过", () => {
  const missing = {
    ...table,
    events: table.events.filter((event) => event.kind !== "light_break"),
  };
  assert.throws(
    () => renderMix(missing, score, design, 158),
    /锚点引用的事件不存在：light_break/,
  );
  assert.throws(
    () => resolveAnchor({ event: "absent" }, table),
    /事件不存在：absent/,
  );
});

test("反例：按速度计算越过 mustEndBefore 必须报乐句、乐器和截止帧", () => {
  const slow = structuredClone(score);
  slow.phrases.find((phrase) => phrase.id === "light")!.tempo = 60;
  assert.throws(
    () => compileScore(slow, table, 158),
    /乐句 light 的 .*按 60 BPM.*越过 mustEndBefore 第 144 帧/,
  );
  const targeted = structuredClone(score);
  targeted.phrases.find((phrase) => phrase.id === "look")!.notes[0].beats = 2;
  assert.throws(
    () => compileScore(targeted, table, 158),
    /乐句 look 的 strings_pad.*越过 mustEndBefore/,
  );
  assert.doesNotThrow(() => compileScore(score, table, 158));
});

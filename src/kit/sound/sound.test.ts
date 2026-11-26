/** 合成乐器的揉弦、采样对齐和裁边测试。用 node --test 运行。待定事项：无。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { createHash } from "node:crypto";
import { frameToSample } from "../shots.ts";
import { place, rate, stereo } from "./dsp.ts";
import { frequency, synthesizeNote } from "./score.ts";
import { synthesizeSfx } from "./sfx.ts";

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

/** 用 node --test 检查两种合成器交付的 PCM，包括人声的基频与口形、鸟叫的扫频与谐波。待定事项：无。 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { synthesizeChirp } from "./chirp.ts";
import { rate } from "./dsp.ts";
import { synthesizeVoice } from "./voice.ts";

const amplitude = (
  samples: Float64Array,
  hz: number,
  start: number,
  duration: number,
) => {
  const length = Math.round(duration * rate),
    offset = Math.round(start * rate);
  let real = 0,
    imag = 0;
  for (let i = 0; i < length; i++) {
    const phase = (2 * Math.PI * hz * i) / rate;
    const window = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (length - 1));
    const value = window * samples[offset + i];
    real += value * Math.cos(phase);
    imag += value * Math.sin(phase);
  }
  return (4 * Math.hypot(real, imag)) / length;
};

test("人声随控制点改变音高，开口后高次谐波相对基音增强，同种子重建一致", () => {
  const render = (mouth: number, seed: number) =>
    synthesizeVoice(
      [
        { at: 0, hz: 200, level: 0, mouth },
        { at: 0.04, hz: 200, level: 0.7, mouth },
        { at: 0.19, hz: 200, level: 0.7, mouth },
        { at: 0.24, hz: 300, level: 0.7, mouth },
        { at: 0.4, hz: 300, level: 0.7, mouth },
        { at: 0.45, hz: 300, level: 0, mouth },
      ],
      { tractScale: 1, breath: 0.09, driftCents: 6 },
      seed,
    );
  const closed = render(0, 7),
    open = render(1, 7);
  assert.equal(closed.samples.length, Math.round(0.45 * rate));
  assert.equal(closed.alignmentSample, 0);
  assert.deepEqual(closed.samples, render(0, 7).samples);
  assert.notDeepEqual(closed.samples, render(0, 8).samples);
  for (const [start, hz, other] of [
    [0.05, 200, 300],
    [0.26, 300, 200],
  ]) {
    const fundamental = amplitude(closed.samples, hz, start, 0.12);
    assert.ok(fundamental > 0.1);
    assert.ok(fundamental > 8 * amplitude(closed.samples, other, start, 0.12));
  }
  const color = (samples: Float64Array) =>
    amplitude(samples, 800, 0.05, 0.12) / amplitude(samples, 200, 0.05, 0.12);
  assert.ok(color(open.samples) > 2 * color(closed.samples));
});

test("鸟叫按传入轨迹上扫再回落，谐波遵循振幅比例，音头和尾端平滑归零", () => {
  const chirp = synthesizeChirp(
    0.08,
    [
      [0, 3000],
      [0.2, 3000],
      [0.35, 5800],
      [0.55, 5800],
      [0.69, 3400],
      [1, 3400],
    ],
    [1, 0.45],
  );
  assert.equal(chirp.alignmentSample, 0);
  assert.equal(chirp.samples.length, 3840);
  assert.ok(
    Math.abs(chirp.samples[0]) < 1e-10 && Math.abs(chirp.samples[3839]) < 1e-10,
  );
  for (const [start, hz] of [
    [0.006, 3000],
    [0.03, 5800],
    [0.056, 3400],
  ]) {
    const fundamental = amplitude(chirp.samples, hz, start, 0.008);
    assert.ok(fundamental > 0.09);
    assert.ok(
      fundamental > 5 * amplitude(chirp.samples, hz + 500, start, 0.008),
    );
    const harmonicRatio =
      amplitude(chirp.samples, 2 * hz, start, 0.008) / fundamental;
    assert.ok(Math.abs(harmonicRatio - 0.45) < 0.01);
  }
});

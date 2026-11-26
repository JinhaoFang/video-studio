/** 十四种纯合成音效；对齐点按材质定义的接触/动作极值返回，环境床接受密度曲线；参考电平在混音前统一归一。 待定事项：无。 */
import { curve, normalizeReference, random, rate } from "../../../src/kit/sound/dsp.ts";
import type { Clip, SfxOptions } from "../../../src/kit/sound/types.ts";

const sfxTiming = {
  rain_tail: [4.5, 0],
  eave_drips: [4, 0],
  higurashi: [4, 0],
  garden_air: [4, 0],
  drip_hit: [0.28, 0.012],
  feather_flinch: [0.12, 0.065],
  feather_shake: [0.17, 0.085],
  water_spray: [0.4, 0],
  feather_puff: [0.18, 0.09],
  pole_creak: [0.35, 0.22],
  takeoff_push: [0.09, 0.015],
  pole_spring: [0.8, 0],
  wing_flap: [0.2, 0.09],
  drip_land: [0.18, 0.003],
} as const;
export type SfxName = keyof typeof sfxTiming;
export const synthesizeSfx = (
  name: SfxName,
  seed: number,
  options: SfxOptions = {},
): Clip => {
  const [defaultDuration, alignment] = sfxTiming[name];
  const seconds = options.seconds ?? defaultDuration;
  const samples = new Float64Array(Math.ceil(seconds * rate));
  const rng = random(seed);
  const twoPi = Math.PI * 2;
  const cutoff = options.cutoffHz ?? (name === "wing_flap" ? 7000 : 6500);
  const alpha = 1 - Math.exp((-twoPi * cutoff) / rate);
  let low = 0,
    dark = 0,
    phase = 0;
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const local = t - alignment;
    const noise = rng() * 2 - 1;
    low += alpha * (noise - low);
    dark += 0.045 * (noise - dark);
    const envelopePosition =
      alignment > 0 && t < alignment
        ? t / alignment
        : 1 + (t - alignment) / (seconds - alignment);
    const bell = Math.sin((Math.PI * Math.min(2, envelopePosition)) / 2) ** 2;
    let value = 0;
    switch (name) {
      case "rain_tail": {
        const progress = t / seconds;
        if (rng() < (110 * (1 - progress) ** 2 + 2) / rate) {
          const f = 400 + rng() * 4500;
          const level = 0.1 + rng() * 0.6;
          for (let j = 0; j < rate * 0.025 && i + j < samples.length; j++) {
            const dt = j / rate;
            samples[i + j] +=
              Math.cos(twoPi * f * dt) * Math.exp(-dt * 220) * level;
          }
        }
        value = low * 0.1 * (1 - progress) ** 2;
        break;
      }
      case "eave_drips":
      case "water_spray": {
        const density =
          name === "water_spray"
            ? 60 * (1 - t / seconds) ** 2
            : 2.2 *
              curve(
                options.density ?? [
                  [0, 1],
                  [seconds, 0.2],
                ],
                t,
              );
        if (i === 0 || rng() < density / rate) {
          const f = 600 + rng() * 2100;
          const level = 0.15 + rng() * 0.6;
          for (let j = 0; j < rate * 0.11 && i + j < samples.length; j++) {
            const dt = j / rate;
            samples[i + j] +=
              level *
              (Math.cos(twoPi * f * dt) * Math.exp(-dt * 65) +
                0.3 * Math.sin(twoPi * 350 * dt) * Math.exp(-dt * 90));
          }
        }
        break;
      }
      case "higurashi": {
        const cycle = t % 2.15;
        if (cycle < 1.1) {
          const pitch = 2850 - 850 * cycle + 125 * Math.sin(twoPi * 24 * t);
          phase += (twoPi * pitch) / rate;
          value =
            (Math.sin(phase) + 0.13 * Math.sin(2 * phase)) *
            Math.sin((Math.PI * cycle) / 1.1) ** 2 *
            (0.65 + 0.35 * Math.sin(twoPi * 28 * t));
        }
        break;
      }
      case "garden_air":
        value =
          (dark * 0.9 + low * 0.06) *
          (1 + 0.2 * Math.sin(twoPi * 0.13 * t) * Math.sin(twoPi * 0.07 * t + 1));
        break;
      case "drip_hit":
      case "drip_land": {
        if (local >= 0) {
          const hit = name === "drip_hit";
          const f = hit ? 210 : 1100;
          value =
            Math.cos(twoPi * f * local - (hit ? 70 : 140) * local ** 2) *
              Math.exp(-local * (hit ? 32 : 55)) *
              0.7 +
            low * Math.exp(-local * 170) * 0.35;
        } else value = dark * 0.03 * (t / alignment);
        break;
      }
      case "feather_flinch":
        value = (low - dark) * bell * 0.5;
        break;
      case "feather_shake":
        value =
          (low * 0.65 + dark * 0.35) *
          bell *
          (0.7 + 0.3 * Math.cos(twoPi * 95 * t));
        break;
      case "feather_puff":
        value =
          (dark * 0.8 + low * 0.15 + Math.sin(twoPi * 95 * t) * 0.1) * bell;
        break;
      case "pole_creak":
        phase +=
          (twoPi * (820 + 170 * Math.sin(twoPi * 9 * t) + noise * 45)) / rate;
        value =
          (Math.sin(phase) * 0.5 + Math.sin(phase * 2.01) * 0.15 + dark * 0.2) *
          bell;
        break;
      case "takeoff_push":
        if (local >= 0)
          value =
            (Math.cos(twoPi * 1250 * local) * 0.65 + dark * 0.3) *
            Math.exp(-local * 110);
        break;
      case "pole_spring":
        for (const [onset, level] of [
          [0, 1],
          [0.19, 0.28],
          [0.4, 0.1],
        ]) {
          const dt = t - onset;
          if (dt >= 0)
            value +=
              level *
              (Math.cos(twoPi * 180 * dt) * Math.exp(-dt * 6.5) +
                0.48 * Math.cos(twoPi * 520 * dt) * Math.exp(-dt * 10));
        }
        break;
      case "wing_flap":
        value = (low * 0.35 + dark * 0.9) * bell;
        break;
    }
    samples[i] += value;
  }
  const alignmentSample = Math.round(alignment * rate);
  if (name === "drip_hit" || name === "drip_land") {
    let maximum = 0;
    for (const sample of samples) maximum = Math.max(maximum, Math.abs(sample));
    samples[alignmentSample] = maximum;
  }
  const tail = Math.min(
    Math.round(rate * 0.005),
    Math.floor(samples.length / 4),
  );
  for (let i = 0; i < tail; i++) samples[samples.length - 1 - i] *= i / tail;
  return normalizeReference({ samples, alignmentSample });
};

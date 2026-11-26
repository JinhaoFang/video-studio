/**
 * 《雨后》的临时音效、环境床与哼唱合成（#185 建，#202 换掉其中的雨）：
 * 沿用小样音效配方与 kit 的 synthesizeChirp / synthesizeVoice，为有声画面事件和环境床（檐下滴水、暮蝉、稻田风、院子空气声）提供对齐到事件帧的临时声音；
 * 保证院子空气底噪全程不断、静默段不掉到数字静音。哼唱把 score.json 的 hum 乐句变成连续的闭口人声（#184 的配方），远近由 render.ts 处理。
 * 雨由 rain.ts 合成，屋里的说话由 walla.ts 合成。
 * 待定事项：正式拟音、叫声与空间混响由 #193 替换。
 */
import { synthesizeChirp } from "../../../src/kit/sound/chirp.ts";
import {
  curve,
  normalizeReference,
  random,
  rate,
} from "../../../src/kit/sound/dsp.ts";
import { frequency } from "../../../src/kit/sound/score.ts";
import type { Clip, SfxOptions } from "../../../src/kit/sound/types.ts";
import {
  synthesizeVoice,
  type VoicePoint,
} from "../../../src/kit/sound/voice.ts";

export type TempSfxName =
  | "eave_drips"
  | "higurashi"
  | "paddy_wind"
  | "garden_air"
  | "thunder"
  | "drip_hit"
  | "drip_land"
  | "mud_step"
  | "mud_pull"
  | "puddle_step"
  | "splash_peak"
  | "basket_creak"
  | "step_stop"
  | "toe_turn"
  | "feather_flinch"
  | "feather_shake"
  | "feather_puff"
  | "claw_shift"
  | "pole_creak"
  | "takeoff_push"
  | "pole_spring"
  | "fall_thud"
  | "wing_flap"
  | "wing_pass"
  | "seal_press"
  | "call_weak"
  | "call_alarm"
  | "call_small"
  | "call_clear"
  | "call_home"
  | "companion_call";

const sfxTiming: Record<TempSfxName, readonly [number, number]> = {
  eave_drips: [4, 0],
  higurashi: [4, 0],
  paddy_wind: [4, 0],
  garden_air: [4, 0],
  thunder: [2.4, 0.12],
  drip_hit: [0.26, 0.012],
  drip_land: [0.16, 0.003],
  mud_step: [0.22, 0.018],
  mud_pull: [0.2, 0.025],
  puddle_step: [0.36, 0.015],
  splash_peak: [0.42, 0.02],
  basket_creak: [0.24, 0.08],
  step_stop: [0.2, 0.018],
  toe_turn: [0.16, 0.02],
  feather_flinch: [0.12, 0.055],
  feather_shake: [0.16, 0.08],
  feather_puff: [0.18, 0.09],
  claw_shift: [0.09, 0.012],
  pole_creak: [0.3, 0.14],
  takeoff_push: [0.09, 0.015],
  pole_spring: [0.75, 0],
  fall_thud: [0.26, 0.01],
  wing_flap: [0.18, 0.075],
  wing_pass: [0.65, 0.18],
  seal_press: [0.16, 0.025],
  call_weak: [0.08, 0.01],
  call_alarm: [0.18, 0.01],
  call_small: [0.07, 0.01],
  call_clear: [0.1, 0.01],
  call_home: [0.11, 0.01],
  companion_call: [0.22, 0.01],
};

const birdContact = (seconds: number, topHz: number): Clip =>
  synthesizeChirp(
    seconds,
    [
      [0, 3100],
      [0.2, topHz],
      [0.34, topHz * 0.95],
      [0.66, 3700],
      [1, 3050],
    ],
    [1, 0.08],
  );

export const synthesizeTempSfx = (
  name: TempSfxName,
  seed: number,
  options: SfxOptions = {},
): Clip => {
  if (name === "call_weak") return normalizeReference(birdContact(0.048, 5050));
  if (name === "call_small") return normalizeReference(birdContact(0.042, 4750));
  if (name === "call_clear") return normalizeReference(birdContact(0.066, 5860));
  if (name === "call_home") return normalizeReference(birdContact(0.074, 6050));
  if (name === "call_alarm") {
    const out = new Float64Array(Math.ceil(0.18 * rate));
    const first = synthesizeChirp(
      0.048,
      [
        [0, 2000],
        [0.18, 2420],
        [0.6, 2340],
        [1, 1950],
      ],
      [0.78, 0.62, 0.34, 0.12],
    );
    const second = synthesizeChirp(
      0.044,
      [
        [0, 2210],
        [0.18, 2670],
        [0.6, 2580],
        [1, 2140],
      ],
      [0.78, 0.62, 0.34, 0.12],
    );
    out.set(first.samples, 0);
    const offset = Math.round(0.08 * rate);
    for (let i = 0; i < second.samples.length && offset + i < out.length; i++) {
      out[offset + i] += second.samples[i] * 0.9;
    }
    return normalizeReference({ samples: out, alignmentSample: first.alignmentSample });
  }
  if (name === "companion_call") {
    const out = new Float64Array(Math.ceil(0.24 * rate));
    const rng = random(seed);
    for (let k = 0; k < 2; k++) {
      const c = birdContact(0.056 + rng() * 0.012, 5350 + rng() * 650);
      const offset = Math.round((k * (0.095 + rng() * 0.02)) * rate);
      for (let i = 0; i < c.samples.length && offset + i < out.length; i++) {
        out[offset + i] += c.samples[i] * (0.85 + 0.15 * rng());
      }
    }
    return normalizeReference({ samples: out, alignmentSample: Math.round(0.01 * rate) });
  }

  const [defaultDuration, alignment] = sfxTiming[name];
  const seconds = options.seconds ?? defaultDuration;
  const samples = new Float64Array(Math.ceil(seconds * rate));
  const rng = random(seed);
  const twoPi = Math.PI * 2;
  const cutoff = options.cutoffHz ?? (name === "wing_flap" || name === "wing_pass" ? 6500 : 5800);
  const alpha = 1 - Math.exp((-twoPi * cutoff) / rate);
  let low = 0;
  let dark = 0;
  let deep = 0;
  let phase = 0;

  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const local = t - alignment;
    const noise = rng() * 2 - 1;
    low += alpha * (noise - low);
    dark += 0.045 * (noise - dark);
    deep += 0.008 * (noise - deep);
    const envPos =
      alignment > 0 && t < alignment
        ? t / alignment
        : 1 + (t - alignment) / Math.max(0.001, seconds - alignment);
    const bell = Math.sin((Math.PI * Math.min(2, Math.max(0, envPos))) / 2) ** 2;
    let value = 0;

    switch (name) {
      case "eave_drips": {
        const dens =
          2.0 *
          curve(
            options.density ?? [
              [0, 1],
              [seconds, 0.2],
            ],
            t,
          );
        if (rng() < dens / rate) {
          const f = 620 + rng() * 2000;
          const level = 0.15 + rng() * 0.55;
          for (let j = 0; j < rate * 0.1 && i + j < samples.length; j++) {
            const dt = j / rate;
            samples[i + j] +=
              level *
              (Math.cos(twoPi * f * dt) * Math.exp(-dt * 65) +
                0.28 * Math.sin(twoPi * 360 * dt) * Math.exp(-dt * 90));
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
      case "paddy_wind": {
        const dens = curve(
          options.density ?? [
            [0, 0.5],
            [seconds, 0.5],
          ],
          t,
        );
        value =
          (dark * 0.65 + low * 0.28) *
          dens *
          (0.72 + 0.28 * Math.sin(twoPi * 0.22 * t + 0.8));
        break;
      }
      case "garden_air": {
        value =
          (dark * 0.9 + low * 0.06) *
          (1 + 0.18 * Math.sin(twoPi * 0.13 * t) * Math.sin(twoPi * 0.07 * t + 1));
        break;
      }
      case "thunder": {
        const env =
          local < 0
            ? Math.max(0, t / alignment)
            : Math.exp(-local * 1.1) * (0.7 + 0.3 * Math.sin(twoPi * 3.1 * local));
        value = (deep * 1.8 + dark * 0.35) * env;
        break;
      }
      case "drip_hit":
      case "drip_land": {
        if (local >= 0) {
          const hit = name === "drip_hit";
          const f = hit ? 210 : 1120;
          value =
            Math.cos(twoPi * f * local - (hit ? 70 : 140) * local ** 2) *
              Math.exp(-local * (hit ? 32 : 55)) *
              0.7 +
            low * Math.exp(-local * 170) * 0.35;
        }
        break;
      }
      case "mud_step":
      case "step_stop": {
        if (local >= 0) {
          value =
            (Math.cos(twoPi * 110 * local) * Math.exp(-local * 26) * 0.65 +
              dark * Math.exp(-local * 38) * 0.55 +
              low * Math.exp(-local * 85) * 0.25);
        }
        break;
      }
      case "mud_pull":
      case "toe_turn": {
        if (local >= 0) {
          const f = name === "mud_pull" ? 260 + 520 * local : 180;
          value =
            (Math.sin(twoPi * f * local) * 0.3 + (low - dark) * 0.55) *
            Math.exp(-local * 28);
        }
        break;
      }
      case "puddle_step":
      case "splash_peak": {
        if (local >= 0) {
          value =
            (Math.cos(twoPi * 150 * local) * Math.exp(-local * 22) * 0.4 +
              low * Math.exp(-local * (name === "splash_peak" ? 9 : 14)) * 0.85);
        }
        break;
      }
      case "basket_creak":
      case "pole_creak": {
        const baseHz = name === "basket_creak" ? 640 : 820;
        phase += (twoPi * (baseHz + 150 * Math.sin(twoPi * 10 * t) + noise * 40)) / rate;
        value = (Math.sin(phase) * 0.5 + Math.sin(phase * 2.02) * 0.16 + dark * 0.18) * bell;
        break;
      }
      case "feather_flinch":
        value = (low - dark) * bell * 0.52;
        break;
      case "feather_shake":
        value = (low * 0.65 + dark * 0.35) * bell * (0.7 + 0.3 * Math.cos(twoPi * 95 * t));
        break;
      case "feather_puff":
        value = (dark * 0.8 + low * 0.15 + Math.sin(twoPi * 95 * t) * 0.1) * bell;
        break;
      case "claw_shift":
      case "takeoff_push":
        if (local >= 0) {
          value =
            (Math.cos(twoPi * (name === "claw_shift" ? 1600 : 1250) * local) * 0.62 + dark * 0.3) *
            Math.exp(-local * 115);
        }
        break;
      case "fall_thud":
        if (local >= 0) {
          value =
            (Math.cos(twoPi * 165 * local) * Math.exp(-local * 18) * 0.8 +
              Math.cos(twoPi * 440 * local) * Math.exp(-local * 32) * 0.35 +
              dark * Math.exp(-local * 45) * 0.3);
        }
        break;
      case "pole_spring":
        for (const [onset, level] of [
          [0, 1],
          [0.19, 0.28],
          [0.4, 0.1],
        ]) {
          const dt = t - onset;
          if (dt >= 0) {
            value +=
              level *
              (Math.cos(twoPi * 180 * dt) * Math.exp(-dt * 6.5) +
                0.48 * Math.cos(twoPi * 520 * dt) * Math.exp(-dt * 10));
          }
        }
        break;
      case "wing_flap":
        value = (low * 0.35 + dark * 0.9) * bell;
        break;
      case "wing_pass":
        value = (dark * 1.1 + low * 0.45) * bell;
        break;
      case "seal_press":
        if (local >= 0) {
          value =
            (Math.cos(twoPi * 140 * local) * Math.exp(-local * 34) * 0.72 +
              dark * Math.exp(-local * 55) * 0.4);
        }
        break;
    }
    samples[i] += value;
  }

  const alignmentSample = Math.round(alignment * rate);
  const tail = Math.min(Math.round(rate * 0.005), Math.floor(samples.length / 4));
  for (let i = 0; i < tail; i++) samples[samples.length - 1 - i] *= i / tail;
  return normalizeReference({ samples, alignmentSample });
};

type RawNote = {
  instrument: string;
  pitch?: string;
  beat: number;
  beats: number;
  velocity: number;
};

type RawScore = {
  fps: number;
  phrases: { id: string; tempo: number; notes: RawNote[] }[];
};

export const synthesizeHumClip = (score: RawScore, seed: number): Clip => {
  const phrase = score.phrases.find((p) => p.id === "hum");
  if (!phrase) return { samples: new Float64Array(1), alignmentSample: 0 };
  const notes = phrase.notes.filter(
    (n): n is RawNote & { pitch: string } => n.instrument === "hum_voice" && Boolean(n.pitch),
  );
  if (!notes.length) return { samples: new Float64Array(1), alignmentSample: 0 };
  const beatSec = 60 / phrase.tempo;
  const rng = random(seed);
  const firstHz = frequency(notes[0].pitch);
  const points: VoicePoint[] = [{ at: 0, hz: firstHz, level: 0, mouth: 0.04 }];
  const pushPoint = (pt: VoicePoint) => {
    const prev = points[points.length - 1];
    const at = Math.max(prev.at + 0.004, pt.at);
    points.push({
      at,
      hz: pt.hz,
      level: Math.max(0, Math.min(1, pt.level)),
      mouth: Math.max(0, Math.min(1, pt.mouth)),
    });
  };
  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const hz = frequency(note.pitch);
    const at = note.beat * beatSec + (i === 0 ? 0 : (2 * rng() - 1) / score.fps);
    const mouth = i === 0 ? 0.24 : 0.03 + 0.04 * rng();
    const level = note.velocity * (0.94 + 0.06 * rng());
    if (i === 0) {
      pushPoint({ at, hz, level: 0, mouth });
    } else {
      const prev = points[points.length - 1];
      pushPoint({ ...prev, at: at - 0.05, level: prev.level * 0.84 });
    }
    pushPoint({ at: at + 0.055, hz, level, mouth });
    pushPoint({
      at: at + Math.min(0.18, note.beats * beatSec * 0.6),
      hz,
      level: level * 0.94,
      mouth: 0.03,
    });
  }
  const last = notes[notes.length - 1];
  const end = (last.beat + last.beats) * beatSec;
  const final = points[points.length - 1];
  pushPoint({ ...final, at: end - 0.2, level: final.level * 0.78 });
  pushPoint({ ...final, at: end, level: 0 });
  return synthesizeVoice(points, { tractScale: 1, breath: 0.06, driftCents: 10 }, seed);
};

/** 无词人声的源—滤波合成。按秒传入连续的基频、力度和开口度控制点（从 0 秒起，末点为结束），返回 48 kHz 单声道 Clip。开口度 0 为闭口鼻音，1 为开口元音。待定事项：无。 */
import { random, rate } from "./dsp.ts";
import type { Clip } from "./types.ts";

export type VoicePoint = {
  at: number;
  hz: number;
  level: number;
  mouth: number;
};
type VoiceColor = { tractScale: number; breath: number; driftCents: number };
const tau = 2 * Math.PI;

const resonance = (bandwidth: number) => {
  const radius = Math.exp((-Math.PI * bandwidth) / rate);
  let last = 0,
    previous = 0;
  return (input: number, hz: number) => {
    const angle = (tau * hz) / rate;
    const next =
      2 * radius * Math.cos(angle) * last -
      radius ** 2 * previous +
      2 * (1 - radius) * Math.sin(angle) * input;
    previous = last;
    last = next;
    return next;
  };
};

export const synthesizeVoice = (
  points: VoicePoint[],
  color: VoiceColor,
  seed: number,
): Clip => {
  if (
    points.length < 2 ||
    points[0].at !== 0 ||
    points.some(
      (p, i) =>
        !Number.isFinite(p.at) ||
        (i > 0 && p.at <= points[i - 1].at) ||
        !(p.hz > 0 && p.hz < rate / 2) ||
        !(p.level >= 0 && p.level <= 1) ||
        !(p.mouth >= 0 && p.mouth <= 1),
    )
  )
    throw new Error(
      "人声控制点须从 0 秒递增，基频有效，力度和开口度在 0–1 之间。",
    );
  const samples = new Float64Array(
    Math.round(points[points.length - 1].at * rate),
  );
  const rng = random(seed);
  const slow = rng() * tau,
    fast = rng() * tau;
  const nasal = resonance(175),
    jaw = resonance(110),
    tongue = resonance(155);
  let phase = 0,
    shimmer = 1,
    segment = 1;
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    while (t > points[segment].at) segment++;
    const a = points[segment - 1],
      b = points[segment];
    const u = (t - a.at) / (b.at - a.at),
      w = u * u * (3 - 2 * u);
    const mouth = a.mouth + (b.mouth - a.mouth) * w;
    const level = a.level + (b.level - a.level) * w;
    const drift =
      color.driftCents *
      (0.64 * Math.sin(tau * 1.17 * t + slow) +
        0.36 * Math.sin(tau * 4.63 * t + fast));
    phase += (a.hz * (b.hz / a.hz) ** w * 2 ** (drift / 1200)) / rate;
    if (phase >= 1) {
      phase %= 1;
      shimmer = 0.97 + 0.06 * rng();
    }
    const rise = 0.49,
      fall = 0.18 + 0.09 * (1 - mouth);
    const glottis =
      phase < rise
        ? Math.sin((Math.PI * phase) / rise)
        : phase < rise + fall
          ? -(rise / fall) * Math.sin((Math.PI * (phase - rise)) / fall)
          : 0;
    const excitation =
      shimmer * glottis +
      color.breath * (rng() * 2 - 1) * (0.3 + Math.abs(glottis));
    const nose = nasal(excitation, 295 * color.tractScale);
    const f1 = jaw(excitation, (380 + 440 * mouth) * color.tractScale);
    const f2 = tongue(excitation, (1040 + 850 * mouth) * color.tractScale);
    samples[i] =
      level *
      (nose * (1 - 0.84 * mouth) +
        f1 * (0.13 + 0.86 * mouth) +
        f2 * (0.09 + 0.67 * mouth));
  }
  return { samples, alignmentSample: 0 };
};

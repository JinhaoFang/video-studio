/** 调频鸟叫单音。用相对时点（0–1）的基频轨迹、时长和各谐波的线性振幅生成 48 kHz Clip，调用方负责音与音的间隔、力度和空间。待定事项：无。 */
import { curve, rate } from "./dsp.ts";
import type { Clip } from "./types.ts";

export const synthesizeChirp = (
  seconds: number,
  contour: readonly (readonly [number, number])[],
  harmonics: readonly number[],
): Clip => {
  const samples = new Float64Array(Math.round(seconds * rate));
  let phase = 0;
  for (let i = 0; i < samples.length; i++) {
    const u = i / Math.max(1, samples.length - 1);
    const hz = curve(contour, u);
    phase += (2 * Math.PI * hz) / rate;
    let source = 0;
    for (let h = 1; h <= harmonics.length && h * hz < rate / 2; h++)
      source += harmonics[h - 1] * Math.sin(h * phase);
    const attack = Math.sin((Math.PI / 2) * Math.min(1, u / 0.14)) ** 2;
    samples[i] = source * attack * (1 - u ** 1.8) ** 2;
  }
  return { samples, alignmentSample: 0 };
};

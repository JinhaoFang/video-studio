/** 声音 DSP：固定种子噪声、K 加权参考电平、双声道 PCM16、无时间位移的落位和参数混响；只计算采样，不读取媒体。 */
import { Buffer } from "node:buffer";
import type { Clip, Scene, Stereo } from "./types.ts";

export const rate = 48000;
export const dbGain = (db: number) => 10 ** (db / 20);
export const random = (seed: number) => {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
};
export const seedFor = (seed: number, key: string) => {
  for (const char of key) seed = Math.imul(seed ^ char.charCodeAt(0), 16777619);
  return seed >>> 0;
};
export const stereo = (length: number): Stereo => [
  new Float64Array(length),
  new Float64Array(length),
];
export const curve = (
  points: readonly (readonly [number, number])[],
  at: number,
): number => {
  if (!points.length) return 1;
  if (at <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    if (at <= points[i][0]) {
      const [x, y] = points[i - 1];
      return y + (points[i][1] - y) * ((at - x) / (points[i][0] - x));
    }
  }
  return points[points.length - 1][1];
};
export const peak = (samples: Float64Array) => {
  let value = 0;
  for (const sample of samples) value = Math.max(value, Math.abs(sample));
  return value;
};
const biquad = (
  samples: Float64Array,
  b: number[],
  a: number[],
): Float64Array => {
  const output = new Float64Array(samples.length);
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < samples.length; i++) {
    const y = b[0] * samples[i] + b[1] * x1 + b[2] * x2 - a[1] * y1 - a[2] * y2;
    output[i] = y;
    x2 = x1;
    x1 = samples[i];
    y2 = y1;
    y1 = y;
  }
  return output;
};
export const kWeighted = (samples: Float64Array) =>
  biquad(
    biquad(
      samples,
      [1.53512485958697, -2.69169618940638, 1.19839281085285],
      [1, -1.69065929318241, 0.73248077421585],
    ),
    [1, -2, 1],
    [1, -1.99004745483398, 0.99007225036621],
  );
export const hottest100ms = (samples: Float64Array): number => {
  const weighted = kWeighted(samples);
  const window = Math.round(rate * 0.1);
  let sum = 0,
    maximum = 0;
  for (let i = 0; i < weighted.length; i++) {
    sum += weighted[i] ** 2;
    if (i >= window) sum -= weighted[i - window] ** 2;
    maximum = Math.max(maximum, sum / window);
  }
  return -0.691 + 10 * Math.log10(maximum);
};
export const normalizeReference = (clip: Clip): Clip => {
  let samples = clip.samples.slice();
  const cap = dbGain(-1.5);
  for (let pass = 0; pass < 12; pass++) {
    const gain = dbGain(-18 - hottest100ms(samples));
    if (!Number.isFinite(gain)) throw new Error("音效没有可测量的采样。");
    for (let i = 0; i < samples.length; i++) samples[i] *= gain;
    if (peak(samples) <= cap)
      return { samples, alignmentSample: clip.alignmentSample };
    samples = samples.map((sample) => cap * Math.tanh(sample / cap));
  }
  throw new Error("音效无法同时满足 100 ms 参考电平和峰值上限。");
};
export const place = (
  target: Stereo,
  clip: Clip,
  alignedSample: number,
  gain = 1,
  pan = 0,
  width = 0,
): number => {
  const start = alignedSample - clip.alignmentSample;
  const left = Math.cos(((pan + 1) * Math.PI) / 4);
  const right = Math.sin(((pan + 1) * Math.PI) / 4);
  for (let i = 0; i < clip.samples.length; i++) {
    const at = start + i;
    if (at < 0 || at >= target[0].length) continue;
    const side = width * 0.35 * (clip.samples[i] - (clip.samples[i - 37] ?? 0));
    target[0][at] += gain * left * (clip.samples[i] + side);
    target[1][at] += gain * right * (clip.samples[i] - side);
  }
  return start;
};
export const add = (target: Stereo, source: Stereo) => {
  for (let c = 0; c < 2; c++)
    for (let i = 0; i < target[c].length; i++) target[c][i] += source[c][i];
};
export const reverb = (dry: Stereo, scene: Scene, wet = 0.16): Stereo => {
  const output: Stereo = [dry[0].slice(), dry[1].slice()];
  const alpha = 1 - Math.exp((-2 * Math.PI * scene.highCutHz) / rate);
  for (let c = 0; c < 2; c++) {
    for (const [index, ms] of (scene.earlyReflectionsMs ?? []).entries()) {
      const delay = Math.round(
        ((scene.preDelayMs + ms + c * 0.37) * rate) / 1000,
      );
      const gain = (wet * 0.55) / (index + 1);
      let low = 0;
      for (let i = delay; i < output[c].length; i++) {
        low += alpha * (dry[c][i - delay] - low);
        output[c][i] += low * gain;
      }
    }
    for (const ratio of [0.071, 0.089, 0.107, 0.131]) {
      const delay = Math.round(rate * (scene.t60 * ratio + c * 0.0013));
      const pre = Math.round((scene.preDelayMs * rate) / 1000);
      const feedback = 10 ** ((-3 * delay) / (rate * scene.t60));
      const line = new Float64Array(delay);
      let low = 0;
      for (let i = pre; i < output[c].length; i++) {
        const index = (i - pre) % delay;
        low += alpha * (line[index] - low);
        line[index] = dry[1 - c][i - pre] + low * feedback;
        output[c][i] += low * wet * 0.25;
      }
    }
  }
  return output;
};
export const pcmWav = (channels: readonly Float64Array[]): Buffer => {
  const length = channels[0].length;
  const block = channels.length * 2;
  const output = Buffer.alloc(44 + length * block);
  output.write("RIFF");
  output.writeUInt32LE(output.length - 8, 4);
  output.write("WAVEfmt ", 8);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(channels.length, 22);
  output.writeUInt32LE(rate, 24);
  output.writeUInt32LE(rate * block, 28);
  output.writeUInt16LE(block, 32);
  output.writeUInt16LE(16, 34);
  output.write("data", 36);
  output.writeUInt32LE(length * block, 40);
  for (let i = 0; i < length; i++)
    for (let c = 0; c < channels.length; c++) {
      const value = channels[c][i];
      if (!Number.isFinite(value) || Math.abs(value) > 1)
        throw new Error("WAV 采样无效或削波。");
      output.writeInt16LE(Math.round(value * 32767), 44 + i * block + c * 2);
    }
  return output;
};

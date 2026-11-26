/** 声音量化验收：FFmpeg EBU R128/真峰值、共用离线限幅包络、独立音符的 Hann FFT 峰值估计；频谱图仅作检查。 待定事项：无。 */
import { Buffer } from "node:buffer";
import { spawnSync } from "node:child_process";
import { dbGain, peak, rate } from "./dsp.ts";
import type { Stereo, Voice } from "./types.ts";

export const media = (args: string[], input?: Buffer) => {
  const result = spawnSync("ffmpeg", args, {
    input,
    encoding: "utf8",
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error(`FFmpeg 运行失败：${result.stderr.slice(-1500)}`);
  return result.stderr;
};
export const measure = (channels: readonly Float64Array[]) => {
  const input = Buffer.alloc(channels[0].length * channels.length * 8);
  for (let i = 0; i < channels[0].length; i++)
    for (let c = 0; c < channels.length; c++)
      input.writeDoubleLE(channels[c][i], (i * channels.length + c) * 8);
  const output = media(
    [
      "-hide_banner",
      "-nostdin",
      "-nostats",
      "-threads",
      "1",
      "-f",
      "f64le",
      "-ar",
      String(rate),
      "-ac",
      String(channels.length),
      "-i",
      "pipe:0",
      "-af",
      "ebur128=peak=true:framelog=verbose",
      "-f",
      "null",
      "-",
    ],
    input,
  );
  const summary = output.slice(output.lastIndexOf("Summary:"));
  const integratedLufs = Number(summary.match(/\bI:\s*([-\d.]+)\s+LUFS/)?.[1]);
  const truePeakDbtp = Number(summary.match(/\bPeak:\s*([-\d.]+)\s+dBFS/)?.[1]);
  if (!Number.isFinite(integratedLufs) || !Number.isFinite(truePeakDbtp))
    throw new Error("声音为空或 FFmpeg 没有返回有效响度摘要。");
  return { integratedLufs, truePeakDbtp };
};
export class MeasurementFailure extends Error {}

export const master = (
  raw: Stereo,
  stems: Record<string, Stereo>,
  target: number,
  maxPeak: number,
  tolerance = 1,
) => {
  const before = measure(raw);
  let gainDb = target - before.integratedLufs;
  let ceiling = maxPeak - 0.3;
  let output: Stereo = raw;
  let envelope = new Float64Array(raw[0].length);
  let after = before;
  for (let attempt = 0; attempt < 6; attempt++) {
    const gain = dbGain(gainDb),
      cap = dbGain(ceiling);
    const length = raw[0].length;
    const maxima = new Float64Array(length);
    for (let i = 0; i < length; i++) {
      maxima[i] = Math.max(Math.abs(raw[0][i]), Math.abs(raw[1][i]));
      for (const stem of Object.values(stems))
        maxima[i] = Math.max(
          maxima[i],
          Math.abs(stem[0][i]),
          Math.abs(stem[1][i]),
        );
    }
    const queue = new Int32Array(length);
    let head = 0,
      tail = 0,
      next = 0,
      limiter = 1;
    const lookahead = Math.round(rate * 0.005);
    const recovery = Math.exp(-1 / (rate * 0.08));
    envelope = new Float64Array(length);
    for (let i = 0; i < length; i++) {
      while (next < Math.min(length, i + lookahead + 1)) {
        while (tail > head && maxima[queue[tail - 1]] <= maxima[next]) tail--;
        queue[tail++] = next++;
      }
      while (queue[head] < i) head++;
      const required = Math.min(
        1,
        cap / Math.max(1e-12, maxima[queue[head]] * gain),
      );
      limiter =
        required < limiter
          ? required
          : required + (limiter - required) * recovery;
      envelope[i] = gain * limiter;
    }
    output = [
      raw[0].map((value, i) => value * envelope[i]),
      raw[1].map((value, i) => value * envelope[i]),
    ];
    after = measure(output);
    if (
      Math.abs(after.integratedLufs - target) <= 0.2 &&
      after.truePeakDbtp <= maxPeak
    )
      break;
    gainDb += target - after.integratedLufs;
    if (after.truePeakDbtp > maxPeak)
      ceiling -= after.truePeakDbtp - maxPeak + 0.1;
  }
  if (
    Math.abs(after.integratedLufs - target) > tolerance ||
    after.truePeakDbtp > maxPeak
  )
    throw new MeasurementFailure("总线无法在限定轮数内达到响度/真峰值目标。");
  for (const bus of Object.values(stems))
    for (let c = 0; c < 2; c++)
      for (let i = 0; i < bus[c].length; i++) bus[c][i] *= envelope[i];
  let minimum = Infinity;
  for (const value of envelope) minimum = Math.min(minimum, value);
  return {
    output,
    before,
    after,
    gainDb,
    maximumReductionDb: gainDb - 20 * Math.log10(minimum),
    limiterCeilingDbfs: ceiling,
  };
};
export const levels = (channels: readonly Float64Array[]) => {
  let energy = 0,
    maximum = 0;
  for (const channel of channels) {
    maximum = Math.max(maximum, peak(channel));
    for (const value of channel) energy += value * value;
  }
  return {
    peakDbfs: 20 * Math.log10(maximum),
    rmsDbfs: 10 * Math.log10(energy / channels[0].length / channels.length),
  };
};
const estimatedPitch = (samples: Float64Array) => {
  const offset = Math.min(
    Math.round(rate * 0.04),
    Math.floor(samples.length / 10),
  );
  const length = Math.min(samples.length - offset, Math.round(rate * 0.5));
  const n = 65536;
  const real = new Float64Array(n),
    imag = new Float64Array(n);
  for (let i = 0; i < length; i++)
    real[i] =
      samples[offset + i] *
      (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (length - 1)));
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) [real[i], real[j]] = [real[j], real[i]];
  }
  for (let size = 2; size <= n; size *= 2) {
    const angle = (-2 * Math.PI) / size;
    for (let start = 0; start < n; start += size)
      for (let i = 0; i < size / 2; i++) {
        const a = start + i,
          b = a + size / 2;
        const c = Math.cos(angle * i),
          s = Math.sin(angle * i);
        const r = real[b] * c - imag[b] * s,
          im = real[b] * s + imag[b] * c;
        real[b] = real[a] - r;
        imag[b] = imag[a] - im;
        real[a] += r;
        imag[a] += im;
      }
  }
  let best = Math.ceil((30 * n) / rate),
    maximum = -Infinity;
  const power = (i: number) =>
    Math.log(Math.max(1e-30, real[i] ** 2 + imag[i] ** 2));
  for (let i = best; i < n / 2 - 1; i++)
    if (power(i) > maximum) {
      maximum = power(i);
      best = i;
    }
  const a = power(best - 1),
    b = power(best),
    c = power(best + 1);
  const bin = best + (0.5 * (a - c)) / (a - 2 * b + c);
  return {
    hz: (bin * rate) / n,
    windowStartSeconds: offset / rate,
    windowSeconds: length / rate,
  };
};
export const pitchReport = (voices: Voice[]) => {
  const notes = voices.map((voice) => {
    const measured = estimatedPitch(voice.samples);
    return {
      instrument: voice.instrument,
      phrase: voice.phrase,
      pitch: voice.pitch,
      expectedHz: voice.frequency,
      estimatedHz: measured.hz,
      cents: 1200 * Math.log2(measured.hz / voice.frequency),
      windowStartSeconds: measured.windowStartSeconds,
      windowSeconds: measured.windowSeconds,
    };
  });
  const quantile = (values: number[], p: number) => {
    const at = (values.length - 1) * p,
      i = Math.floor(at);
    return values[i] + (values[Math.ceil(at)] - values[i]) * (at - i);
  };
  const instruments = Object.fromEntries(
    [...new Set(notes.map((note) => note.instrument))].map((instrument) => {
      const measured = notes.filter((note) => note.instrument === instrument);
      const absolute = measured
        .map((note) => Math.abs(note.cents))
        .sort((a, b) => a - b);
      return [
        instrument,
        {
          count: absolute.length,
          medianAbsoluteCents: quantile(absolute, 0.5),
          p90AbsoluteCents: quantile(absolute, 0.9),
          maximumAbsoluteCents: absolute[absolute.length - 1],
          pitches: [...new Set(measured.map((note) => note.pitch))],
        },
      ];
    }),
  );
  return {
    method:
      "对实际编译的每颗独立干音（含力度、expression 与刮奏各音）取起音后 40 ms 至最多 500 ms，短音按长度缩窗；Hann 窗、65536 点零填充 FFT，30 Hz 至 Nyquist 全频域最大功率峰，三点对数抛物线插值。不用目标音高限定搜索；统计绝对音分误差，notes 保留带符号误差。短音分辨率、弦乐揉弦及非谐波模态均会影响估计；不代表混音内的音高识别。",
    instruments,
    notes,
  };
};
export const spectrum = (input: string, output: string) =>
  media([
    "-hide_banner",
    "-loglevel",
    "error",
    "-nostdin",
    "-y",
    "-threads",
    "1",
    "-i",
    input,
    "-filter_complex_threads",
    "1",
    "-lavfi",
    "showspectrumpic=s=960x480:legend=1:scale=log:fscale=log:color=intensity",
    "-frames:v",
    "1",
    "-threads",
    "1",
    output,
  ]);

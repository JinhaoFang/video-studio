/** Node 合成占位撞击声，按音效对齐点落位；音效为单声道、混音为双声道，输出确定性的 PCM16 WAV。 */
import { Buffer } from "node:buffer";
import { frameToSample } from "./model.ts";
import type { FilmEvent } from "./model.ts";

export const sampleRate = 48000;
export type Sound = { samples: Float64Array; alignmentSample: number };

export const synthesizeImpact = (seed: number): Sound => {
  const alignmentSample = 480;
  const samples = new Float64Array(sampleRate * 4);
  let state = seed >>> 0;
  for (let i = 0; i < samples.length; i++) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const noise = (state / 4294967296) * 2 - 1;
    const t = (i - alignmentSample) / sampleRate;
    if (t < 0) {
      samples[i] = noise * 0.02 * (i / alignmentSample);
    } else {
      const attack = Math.exp(-t * 120) * noise;
      const body = Math.cos(2 * Math.PI * 110 * t) * Math.exp(-t * 1.8);
      const overtone = Math.cos(2 * Math.PI * 220 * t) * Math.exp(-t * 2.8);
      samples[i] =
        (body * 0.65 + overtone * 0.2 + attack * 0.1) *
        Math.min(1, (4 - i / sampleRate) * 20);
    }
  }
  return { samples, alignmentSample };
};

export const mixEvents = (
  events: readonly FilmEvent[],
  sound: Sound,
  duration: number,
  frameRate: number,
  rate = sampleRate,
): Float64Array => {
  const mix = new Float64Array(frameToSample(duration, rate, frameRate));
  for (const event of events) {
    const start =
      frameToSample(event.frame, rate, frameRate) - sound.alignmentSample;
    for (let i = 0; i < sound.samples.length; i++) {
      const target = start + i;
      if (target >= 0 && target < mix.length) mix[target] += sound.samples[i];
    }
  }
  return mix;
};

export const wav = (
  samples: Float64Array,
  gain = 1,
  channels: 1 | 2 = 1,
): Buffer => {
  const blockAlign = channels * 2;
  const output = Buffer.alloc(44 + samples.length * blockAlign);
  output.write("RIFF", 0);
  output.writeUInt32LE(output.length - 8, 4);
  output.write("WAVEfmt ", 8);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(channels, 22);
  output.writeUInt32LE(sampleRate, 24);
  output.writeUInt32LE(sampleRate * blockAlign, 28);
  output.writeUInt16LE(blockAlign, 32);
  output.writeUInt16LE(16, 34);
  output.write("data", 36);
  output.writeUInt32LE(samples.length * blockAlign, 40);
  for (let i = 0; i < samples.length; i++) {
    const value = samples[i] * gain;
    if (Math.abs(value) > 1) throw new Error("混音削波，请降低增益。");
    for (let channel = 0; channel < channels; channel++)
      output.writeInt16LE(
        Math.round(value * 32767),
        44 + i * blockAlign + channel * 2,
      );
  }
  return output;
};

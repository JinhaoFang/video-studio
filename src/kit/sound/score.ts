/** 乐谱编译与四件合成乐器：加法钢琴/竖琴/钟琴、四人弦乐声部；揉弦初相独立于载波累加，先验证锚点及 mustEndBefore，绝不按截止点缩短不合规乐句。 待定事项：无。 */
import { frameToSample } from "../shots.ts";
import { curve, random, rate, seedFor } from "./dsp.ts";
import type { Anchor, EventTable, Instrument, Score, Voice } from "./types.ts";

export const resolveAnchor = (anchor: Anchor, table: EventTable): number => {
  if ("event" in anchor) {
    const events = table.events.filter((event) => event.kind === anchor.event);
    if (!events.length)
      throw new Error(`锚点引用的事件不存在：${anchor.event}`);
    return (
      Math.min(...events.map((event) => event.frame)) +
      (anchor.offsetFrames ?? 0)
    );
  }
  const row = table.shotTable.find((shot) => shot.id === anchor.shot);
  if (!row) throw new Error(`锚点引用的镜头不存在：${anchor.shot}`);
  if (
    !Number.isInteger(anchor.frame) ||
    anchor.frame < 0 ||
    anchor.frame > row.durationInFrames
  )
    throw new Error(`镜头锚点越界：${anchor.shot} 第 ${anchor.frame} 帧`);
  return row.startFrame + anchor.frame;
};
export const midi = (pitch: string): number => {
  const match = /^([A-G])([#-]?)(-?\d+)$/.exec(pitch);
  if (!match) throw new Error(`无法识别的音高：${pitch}`);
  return (
    (Number(match[3]) + 1) * 12 +
    ({ C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[match[1]] ?? 0) +
    (match[2] === "-" ? -1 : match[2] === "#" ? 1 : 0)
  );
};
export const frequency = (pitch: string) =>
  440 * 2 ** ((midi(pitch) - 69) / 12);
const pitchName = (note: number) =>
  `${["C", "C#", "D", "E-", "E", "F", "F#", "G", "A-", "A", "B-", "B"][note % 12]}${Math.floor(note / 12) - 1}`;
const glissPitches = (from: string, to: string, scale: string): string[] => {
  const tonic = /^([A-G][#-]?) major$/.exec(scale);
  if (!tonic) throw new Error(`不支持的刮奏音阶：${scale}`);
  const root = midi(`${tonic[1]}0`) % 12;
  const notes = [];
  for (let note = midi(from); note <= midi(to); note++)
    if ([0, 2, 4, 5, 7, 9, 11].includes((note - root + 12) % 12)) notes.push(pitchName(note));
  if (!notes.length) throw new Error("竖琴刮奏音域为空。");
  return notes;
};
export const synthesizeNote = (
  instrument: Instrument,
  pitch: string,
  seconds: number,
  velocity: number,
  seed: number,
): Float64Array => {
  const samples = new Float64Array(Math.max(1, Math.round(seconds * rate)));
  const f = frequency(pitch);
  const rng = random(seed);
  const vibratoPhases = Array.from({ length: 4 }, () => rng() * 0.25);
  const carrierPhases = vibratoPhases.slice();
  const detunes = Array.from({ length: 4 }, () => (rng() - 0.5) * 3);
  const twoPi = 2 * Math.PI;
  for (let i = 0; i < samples.length; i++) {
    const t = i / rate;
    const release = Math.min(
      1,
      (samples.length - 1 - i) / Math.min(rate * 0.04, samples.length * 0.2),
    );
    let value = 0;
    if (instrument === "strings_pad") {
      for (let player = 0; player < 4; player++) {
        const cents =
          detunes[player] +
          3 * Math.sin(twoPi * (4.7 + player * 0.23) * t + vibratoPhases[player]);
        carrierPhases[player] += (twoPi * f * 2 ** (cents / 1200)) / rate;
        for (let h = 1; h <= 7 && f * h < rate / 2; h++)
          value +=
            (Math.sin(h * carrierPhases[player]) * Math.exp(-h * 0.35)) / h / 4;
      }
      value *= Math.min(1, t / Math.min(0.12, seconds / 4)) * 0.45;
    } else if (instrument === "glockenspiel") {
      value =
        Math.sin(twoPi * f * t) * Math.exp(-t * 1.2) +
        0.22 * Math.sin(twoPi * f * 2.76 * t) * Math.exp(-t * 3.5) +
        0.08 * Math.sin(twoPi * f * 5.4 * t) * Math.exp(-t * 6);
      value *= Math.min(1, t / 0.006) * 0.45;
    } else {
      const harp = instrument === "harp";
      for (let h = 1; h <= (harp ? 10 : 7) && f * h < rate / 2; h++) {
        const stretch = harp ? 1 : Math.sqrt((1 + 0.000025 * h * h) / 1.000025);
        const amplitude =
          h === 1
            ? 1
            : ((harp ? 0.6 : 0.4) * Math.exp(-h * (harp ? 0.22 : 0.45))) / h;
        value +=
          amplitude *
          Math.sin(twoPi * f * h * stretch * t) *
          Math.exp(-t * (harp ? 1.7 + h * 0.4 : 0.9 + h * 0.32));
      }
      value +=
        (rng() * 2 - 1) *
        Math.exp(-t * (harp ? 120 : 180)) *
        (harp ? 0.035 : 0.015);
      value *= Math.min(1, t / (harp ? 0.002 : 0.009)) * (harp ? 0.6 : 0.5);
    }
    samples[i] = value * velocity * Math.max(0, release);
  }
  return samples;
};
export const compileScore = (
  score: Score,
  table: EventTable,
  seed: number,
): Voice[] => {
  if (score.fps !== table.fps || table.sampleRate !== rate)
    throw new Error("乐谱/事件表帧率不一致，或采样率不是 48000 Hz。");
  const duration = Math.max(
    ...table.shotTable.map((shot) => shot.startFrame + shot.durationInFrames),
  );
  for (const section of score.sections) resolveAnchor(section.from, table);
  const plans = score.phrases.map((phrase) => {
    if (!(phrase.tempo > 0)) throw new Error(`乐句速度无效：${phrase.id}`);
    const start = resolveAnchor(phrase.anchor, table);
    const framesPerBeat = (table.fps * 60) / phrase.tempo;
    const end = Math.max(...phrase.notes.map((note) => note.beat + note.beats));
    const deadline = phrase.mustEndBefore
      ? resolveAnchor(phrase.mustEndBefore, table)
      : duration;
    for (const note of phrase.notes) {
      if (
        !(note.beats > 0) ||
        note.velocity < 0 ||
        note.velocity > 1 ||
        !score.instruments[note.instrument]
      )
        throw new Error(`乐句音符无效：${phrase.id}`);
      const limited =
        !phrase.mustEndBefore?.instruments ||
        phrase.mustEndBefore.instruments.includes(note.instrument);
      const noteEnd = start + (note.beat + note.beats) * framesPerBeat;
      if (limited && noteEnd > deadline + 1e-9)
        throw new Error(
          `乐句 ${phrase.id} 的 ${note.instrument} 按 ${phrase.tempo} BPM 结束于第 ${noteEnd.toFixed(3)} 帧，越过 mustEndBefore 第 ${deadline} 帧。`,
        );
      if (noteEnd > duration || start + note.beat * framesPerBeat < 0)
        throw new Error(`乐句越过全片边界：${phrase.id}`);
    }
    return { phrase, start, framesPerBeat, end, deadline };
  });
  const voices: Voice[] = [];
  for (const { phrase, start, framesPerBeat, end, deadline } of plans) {
    for (const [index, note] of phrase.notes.entries()) {
      const pitches = note.gliss
        ? glissPitches(note.gliss.from, note.gliss.to, note.gliss.scale)
        : [note.pitch!];
      for (const [ordinal, pitch] of pitches.entries()) {
        const [low, high] = score.instruments[note.instrument]!.range;
        if (midi(pitch) < midi(low) || midi(pitch) > midi(high))
          throw new Error(`音高超出乐器音域：${note.instrument} ${pitch}`);
        const beat =
          note.beat +
          (note.gliss ? (note.beats * ordinal) / pitches.length : 0);
        const pedal =
          note.instrument === "piano_felt" ||
          (note.instrument === "harp" && Boolean(note.gliss));
        const endBeat = pedal ? end : note.beat + note.beats;
        const length = ((endBeat - beat) * 60) / phrase.tempo;
        const samples = synthesizeNote(
          note.instrument,
          pitch,
          length,
          note.velocity / Math.sqrt(pitches.length),
          seedFor(seed, `${phrase.id}/${index}/${ordinal}`),
        );
        const points = phrase.expression?.find(
          (item) => item.instrument === note.instrument,
        )?.points;
        if (points)
          for (let i = 0; i < samples.length; i++)
            samples[i] *= curve(
              points,
              beat + ((i / rate) * phrase.tempo) / 60,
            );
        const limited =
          !phrase.mustEndBefore?.instruments ||
          phrase.mustEndBefore.instruments.includes(note.instrument);
        voices.push({
          instrument: note.instrument,
          pitch,
          phrase: phrase.id,
          start: frameToSample(start + beat * framesPerBeat, rate, table.fps),
          cutoff: frameToSample(limited ? deadline : duration, rate, table.fps),
          samples,
          frequency: frequency(pitch),
        });
      }
    }
  }
  return voices;
};

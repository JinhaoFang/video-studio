/** 声音设计契约。由调用方传入乐谱、事件与混音设计，采样放在 Clip / Stereo 中。 待定事项：无。 */
import type { FilmEvent, ShotRow } from "../shots.ts";

export type Instrument = "piano_felt" | "strings_pad" | "harp" | "glockenspiel";
export type Anchor =
  | { event: string; offsetFrames?: number }
  | { shot: string; frame: number };
export type EventTable = {
  fps: number;
  sampleRate: number;
  shotTable: ShotRow[];
  events: FilmEvent[];
};
export type Note = {
  instrument: Instrument;
  pitch?: string;
  gliss?: { from: string; to: string; scale: string };
  beat: number;
  beats: number;
  velocity: number;
};
export type Phrase = {
  id: string;
  section: string;
  anchor: Anchor;
  tempo: number;
  notes: Note[];
  expression?: { instrument: Instrument; points: [number, number][] }[];
  articulation?: string;
  mustEndBefore?: Anchor & { instruments?: Instrument[] };
};
export type Score = {
  fps: number;
  instruments: Partial<Record<
    Instrument,
    { name: string; range: [string, string]; notes: string }
  >>;
  sections: { id: string; from: Anchor }[];
  phrases: Phrase[];
};
export type SfxOptions = {
  seconds?: number;
  cutoffHz?: number;
  density?: [number, number][];
};
export type SynthesizeSfx<Name extends string> = (
  name: Name,
  seed: number,
  options: SfxOptions,
) => Clip;
export type Scene = {
  t60: number;
  preDelayMs: number;
  earlyReflectionsMs?: number[];
  highCutHz: number;
};
export type SfxDesign = {
  name: string;
  material: string;
  alignment: string | null;
  tier: string;
  db: number;
  scene: string;
  pan: number;
  width?: number;
  variation?: string;
};
export type SoundDesign<Name extends string = string> = {
  tiers: Record<string, { range: [number, number] }>;
  scenes: Record<string, Scene>;
  sfx: Record<Name, SfxDesign>;
  eventMap: Record<string, { offsetFrames: number; sfx: Name }[]>;
  extra: { sfx: Name; at: Anchor }[];
  beds: {
    sfx: Name;
    from: Anchor;
    to: Anchor;
    fadeInFrames?: number;
    fadeOutFrames?: number;
    density?: [Anchor, number][];
  }[];
  silences: {
    from: Anchor;
    to: Anchor;
    mute: string[];
    duck?: Record<string, number>;
  }[];
  ducking: {
    on: string[];
    musicDb: number;
    attackMs: number;
    holdMs: number;
    releaseMs: number;
  };
  master: {
    integratedLufs: number;
    toleranceLu: number;
    maxTruePeakDbtp: number;
    fadeOutFrames: number;
    stems: string[];
  };
};
export type Stereo = [Float64Array, Float64Array];
export type Clip = { samples: Float64Array; alignmentSample: number };
export type Voice = {
  instrument: Instrument;
  pitch: string;
  phrase: string;
  start: number;
  cutoff: number;
  samples: Float64Array;
  frequency: number;
};

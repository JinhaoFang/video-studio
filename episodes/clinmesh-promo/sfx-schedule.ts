/**
 * Central sentence-anchored SFX schedule and dual-offset compensation math.
 * Peak offsets come from 10ms RMS measurements in sfx/audio-manifest.json; every
 * event is derived from timeline sentence anchors so pause edits shift cleanly.
 */
import { sentence, sentenceFrame } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { BREATHER_DURATION_F, OUTPUT_AUDIO_OFFSET_F } from "./tokens";

export const MEASURED_PEAK_F: Record<string, number> = {
  "fs-71852.mp3": 13.05,
  "fs-464302.mp3": 34.05,
  "fs-444431.mp3": 14.85,
  "fs-331656.mp3": 0,
  "fs-520684.mp3": 25.65,
  "fs-629979.mp3": 5.25,
  "fs-815493.mp3": 4.95,
  "fs-278205.mp3": 1.05,
  "fs-685256.mp3": 82.35,
  "fs-177242.mp3": 55.35,
  "fs-671375.mp3": 1.05,
  "fs-562196.mp3": 0.45,
};

export type SfxCue = {
  id: string;
  src: string;
  targetPeakFrame: number;
  from: number;
  volume: number;
  durationInFrames?: number;
  fadeOutFrames?: number;
};

export const sfxFrom = (
  targetPeakF: number,
  src: string,
  outputOffsetF = OUTPUT_AUDIO_OFFSET_F,
): number =>
  Math.max(
    0,
    Math.round(targetPeakF - (MEASURED_PEAK_F[src] ?? 0) - outputOffsetF),
  );

export const breatherStartFrame = (
  timeline: Timeline,
  afterLineId: "L005" | "L008" | "L010",
): number => sentence(timeline, afterLineId).endFrame + 3;

export const s06ClickOffset = (timeline: Timeline): number => {
  const l010 = sentence(timeline, "L010");
  return Math.max(108, l010.endFrame - l010.startFrame - 52);
};

export const buildSfxSchedule = (
  timeline: Timeline,
  outputOffsetF = OUTPUT_AUDIO_OFFSET_F,
): SfxCue[] => {
  const at = (id: string, offset = 0) => sentenceFrame(timeline, id, offset);
  const b01 = breatherStartFrame(timeline, "L005");
  const b02 = breatherStartFrame(timeline, "L008");
  const b03 = breatherStartFrame(timeline, "L010");
  const raw: Array<{
    id: string;
    src: string;
    targetPeakFrame: number;
    volume: number;
    durationInFrames?: number;
    fadeOutFrames?: number;
  }> = [
    {
      id: "s01-room-dissolve",
      src: "fs-71852.mp3",
      targetPeakFrame: at("L003", 2),
      volume: 0.24,
    },
    {
      id: "s01-brand-settle",
      src: "fs-671375.mp3",
      targetPeakFrame: at("L003", 52),
      volume: 0.2,
    },
    {
      id: "s02-explode-layers",
      src: "fs-464302.mp3",
      targetPeakFrame: at("L005", 16),
      volume: 0.34,
    },
    {
      id: "s02-snap-thud",
      src: "fs-671375.mp3",
      targetPeakFrame: at("L005", 136),
      volume: 0.24,
    },
    {
      id: "b01-whoosh",
      src: "fs-71852.mp3",
      targetPeakFrame: b01 + 6,
      volume: 0.28,
    },
    {
      id: "s03-emr-typing",
      src: "fs-331656.mp3",
      targetPeakFrame: at("L006", 18),
      volume: 0.2,
      durationInFrames: 72,
      fadeOutFrames: 8,
    },
    {
      id: "s03-portal-wipe",
      src: "fs-71852.mp3",
      targetPeakFrame: at("L007", -2),
      volume: 0.32,
    },
    {
      id: "s04-drg-freeze-shutter",
      src: "fs-520684.mp3",
      targetPeakFrame: at("L008", 112),
      volume: 0.4,
    },
    {
      id: "b02-whoosh",
      src: "fs-71852.mp3",
      targetPeakFrame: b02 + 6,
      volume: 0.28,
    },
    {
      id: "s05-pan-slide",
      src: "fs-464302.mp3",
      targetPeakFrame: at("L009", 148),
      volume: 0.34,
    },
    {
      id: "s05-allergy-intercept",
      src: "fs-629979.mp3",
      targetPeakFrame: at("L009", 168),
      volume: 0.22,
    },
    {
      id: "s06-human-latch",
      src: "fs-815493.mp3",
      targetPeakFrame: at("L010", s06ClickOffset(timeline)),
      volume: 0.46,
    },
    {
      id: "b03-whoosh",
      src: "fs-71852.mp3",
      targetPeakFrame: b03 + 6,
      volume: 0.28,
    },
    {
      id: "s07-roi1-lock",
      src: "fs-520684.mp3",
      targetPeakFrame: at("L011", 66),
      volume: 0.36,
    },
    {
      id: "s07-roi2-lock",
      src: "fs-629979.mp3",
      targetPeakFrame: at("L011", 104),
      volume: 0.25,
    },
    {
      id: "s08-finale-riser",
      src: "fs-685256.mp3",
      targetPeakFrame: at("L014", 12),
      volume: 0.32,
    },
    {
      id: "s08-wordmark-impact",
      src: "fs-177242.mp3",
      targetPeakFrame: at("L014", 16),
      volume: 0.3,
      durationInFrames: 183,
      fadeOutFrames: 48,
    },
    {
      id: "s08-rule-sparkle",
      src: "fs-562196.mp3",
      targetPeakFrame: at("L014", 32),
      volume: 0.24,
    },
  ];
  return raw.map((cue) => ({
    ...cue,
    from: sfxFrom(cue.targetPeakFrame, cue.src, outputOffsetF),
  }));
};

export const breatherSpans = (timeline: Timeline) => [
  {
    id: "B01",
    chapterNo: "01",
    titlePrefix: "无感伴随智能 ·",
    accentWord: "静默运转",
    from: breatherStartFrame(timeline, "L005"),
    durationInFrames: BREATHER_DURATION_F,
  },
  {
    id: "B02",
    chapterNo: "02",
    titlePrefix: "溯源质控 ·",
    accentWord: "人工把关",
    from: breatherStartFrame(timeline, "L008"),
    durationInFrames: BREATHER_DURATION_F,
  },
  {
    id: "B03",
    chapterNo: "03",
    titlePrefix: "多病种智能体 ·",
    accentWord: "即插即用",
    from: breatherStartFrame(timeline, "L010"),
    durationInFrames: BREATHER_DURATION_F,
  },
];

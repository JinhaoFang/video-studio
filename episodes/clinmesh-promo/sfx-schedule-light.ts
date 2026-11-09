/**
 * Sentence-anchored SFX schedule and breather spans for the standalone
 * ClinMeshPromoLight composition: preserves S01, S02, S07, S08, and B01-B03
 * cues while aligning S03-S06 foley clicks, tab switches, and drawer slides
 * to the authentic Light-Theme ClinMesh UI interactions.
 */
import { sentence, sentenceFrame } from "../../src/kit/sentence-timing";
import type { Timeline } from "../../tools/timeline-types";
import { S06_LIGHT_SIGN_CLICK_OFFSET_F } from "./ShotS06LightSignoff";
import { type SfxCue, sfxFrom } from "./sfx-schedule";
import { BREATHER_DURATION_F, OUTPUT_AUDIO_OFFSET_F } from "./tokens";

export const lightBreatherStartFrame = (
  timeline: Timeline,
  afterLineId: "L005" | "L008" | "L010",
): number =>
  afterLineId === "L010"
    ? sentence(timeline, "L010").endFrame + 12
    : sentence(timeline, afterLineId).endFrame + 3;

export const lightBreatherSpans = (timeline: Timeline) => [
  {
    id: "B01",
    chapterNo: "01",
    titlePrefix: "无感伴随智能 ·",
    accentWord: "静默运转",
    from: lightBreatherStartFrame(timeline, "L005"),
    durationInFrames: BREATHER_DURATION_F,
  },
  {
    id: "B02",
    chapterNo: "02",
    titlePrefix: "溯源质控 ·",
    accentWord: "人工把关",
    from: lightBreatherStartFrame(timeline, "L008"),
    durationInFrames: BREATHER_DURATION_F,
  },
  {
    id: "B03",
    chapterNo: "03",
    titlePrefix: "多病种智能体 ·",
    accentWord: "即插即用",
    from: lightBreatherStartFrame(timeline, "L010"),
    durationInFrames: BREATHER_DURATION_F,
  },
];

export const buildLightSfxSchedule = (
  timeline: Timeline,
  outputOffsetF = OUTPUT_AUDIO_OFFSET_F,
): SfxCue[] => {
  const at = (id: string, offset = 0) => sentenceFrame(timeline, id, offset);
  const b01 = lightBreatherStartFrame(timeline, "L005");
  const b02 = lightBreatherStartFrame(timeline, "L008");
  const b03 = lightBreatherStartFrame(timeline, "L010");
  const s03Start = b01 + BREATHER_DURATION_F;
  const s04Start = at("L008");
  const s05Start = b02 + BREATHER_DURATION_F;
  const s06Start = at("L010");

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
      id: "s03-auto-record-tab",
      src: "fs-278205.mp3",
      targetPeakFrame: s03Start + 92,
      volume: 0.2,
    },
    {
      id: "s03-emr-populate",
      src: "fs-331656.mp3",
      targetPeakFrame: s03Start + 162,
      volume: 0.18,
      durationInFrames: 36,
      fadeOutFrames: 8,
    },
    {
      id: "s03-lab-candidates-open",
      src: "fs-278205.mp3",
      targetPeakFrame: s03Start + 236,
      volume: 0.2,
    },
    {
      id: "s03-guideline-drawer",
      src: "fs-629979.mp3",
      targetPeakFrame: s03Start + 324,
      volume: 0.24,
    },
    {
      id: "s04-drg-tab-switch",
      src: "fs-278205.mp3",
      targetPeakFrame: s04Start + 62,
      volume: 0.2,
    },
    {
      id: "s04-drg-headroom-lock",
      src: "fs-520684.mp3",
      targetPeakFrame: s04Start + 104,
      volume: 0.34,
    },
    {
      id: "s04-postop-check",
      src: "fs-629979.mp3",
      targetPeakFrame: s04Start + 150,
      volume: 0.24,
    },
    {
      id: "b02-whoosh",
      src: "fs-71852.mp3",
      targetPeakFrame: b02 + 6,
      volume: 0.28,
    },
    {
      id: "s05-emr-tab-switch",
      src: "fs-278205.mp3",
      targetPeakFrame: s05Start + 74,
      volume: 0.2,
    },
    {
      id: "s05-quality-drawer",
      src: "fs-629979.mp3",
      targetPeakFrame: s05Start + 138,
      volume: 0.26,
    },
    {
      id: "s05-allergy-resolved",
      src: "fs-671375.mp3",
      targetPeakFrame: s05Start + 194,
      volume: 0.22,
    },
    {
      id: "s06-diag-confirm",
      src: "fs-629979.mp3",
      targetPeakFrame: s06Start + 34,
      volume: 0.24,
    },
    {
      id: "s06-rx-open-adjust",
      src: "fs-278205.mp3",
      targetPeakFrame: s06Start + 78,
      volume: 0.2,
    },
    {
      id: "s06-rx-keep-adjust",
      src: "fs-671375.mp3",
      targetPeakFrame: s06Start + 110,
      volume: 0.22,
    },
    {
      id: "s06-rx-issue",
      src: "fs-629979.mp3",
      targetPeakFrame: s06Start + 132,
      volume: 0.26,
    },
    {
      id: "s06-emr-sign-latch",
      src: "fs-815493.mp3",
      targetPeakFrame: s06Start + S06_LIGHT_SIGN_CLICK_OFFSET_F,
      volume: 0.44,
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

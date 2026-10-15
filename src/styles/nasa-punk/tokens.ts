/**
 * NASA-punk style tokens (design-owned). Scene code reads colors, type, subtitle,
 * HUD, finish and motion values from here instead of hard-coding them.
 * Start point: docs/research/nasa-ep04/style.md; frame-sampled colors win over the
 * description's values. Sizes are px at 1920x1080; durations are frames at 30fps.
 * Motion values were set by the 0:04-0:09 sample shot (#64); see the episode README.
 * `stripe` is listed left to right as in the subtitle strip (blue, gold, orange, red);
 * horizontal bands use it reversed, red on top. Sampled at reference 0:06 and 0:12.
 * firstChapter adds #66 reference-frame measurements without changing the sample.
 */
export const color = {
  paper: "#EDE4D9",
  panel: "#E4DFD4",
  paperShade: "#DED8CE",
  stripe: ["#2C4A84", "#DDA244", "#EE6A2E", "#D83A3A"],
  accentRed: "#CA4025",
  wormRed: "#BE3B2B",
  desk: "#251E17",
  deskCorner: "#1B1611",
  nearBlack: "#0D0B09",
  warningYellow: "#E29C12",
  ink: "#1E1A16",
  inkSoft: "#4A443E",
  inkMuted: "#8C8680",
  subtitleBg: "rgba(58, 53, 49, 0.86)",
  subtitleText: "#F2EDE8",
  hudOnDark: "rgba(237, 228, 217, 0.78)",
  hudOnDarkLine: "rgba(237, 228, 217, 0.45)",
  hudOnDarkFaint: "rgba(237, 228, 217, 0.55)",
} as const;

export const typeScale = {
  subtitle: { size: 36, weight: 500, letterSpacing: "0.02em" },
  hudBar: { size: 15, weight: 400, letterSpacing: "0.18em" },
  credit: { size: 13, weight: 400, letterSpacing: "0.12em" },
  hudLabel: { weight: 700, mutedWeight: 400, letterSpacing: "0.22em" },
  hudTimeline: { weight: 700, letterSpacing: "0.3em" },
} as const;

export const subtitle = {
  bottom: 48,
  height: 58,
  paddingX: 28,
  stripeWidth: 5.5,
  expandFrames: 6,
  collapseFrames: 6,
  holdAfterFrames: 9,
  joinGapFrames: 5,
  stripKeepGapFrames: 30,
  stripFadeFrames: 6,
} as const;

export const hud = {
  edgeInset: 63,
  barLineY: 62,
  barTextGap: 10,
  creditBottom: 38,
  bracketArmRatio: 0.11,
  bracketStroke: 3.2,
} as const;

export const finish = {
  grainOpacity: 0.11,
  grainFrequency: 0.85,
  grainSeedCycle: 24,
  vignetteInner: 0.5,
  vignetteStrength: 0.55,
  photoFilter: "sepia(0.2) saturate(0.82) contrast(1.04) brightness(0.96)",
} as const;

export const motion = {
  dissolveFrames: 8,
  chapterDissolveFrames: 8,
  lineDrawFrames: 8,
  barDrawFrames: 12,
  typeCharsPerFrame: 1.5,
  pushPerSecond: 0.01,
} as const;

export const firstChapter = {
  tightFraming: { anchor: { x: 1025, y: 540 }, scale: 1.43 },
  middleFraming: { anchor: { x: 980, y: 540 }, scale: 0.94 },
  reframeOffsetFrames: 18,
  stampOffsetFrames: 30,
  peelOffsetFrames: 24,
  stripeOffsetFrames: 24,
  paper: {
    width: 540,
    height: 220,
    centerOffsetY: -18,
    rotation: -3,
    labelSize: 34,
    shadowBlur: 12,
  },
  stripeHeight: 12,
  stripeGap: 34,
  tagGap: 20,
  tagPaddingX: 18,
  tagPaddingY: 8,
} as const;

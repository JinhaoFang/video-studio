/**
 * NASA-punk style tokens (design-owned). Scene code reads colors, type, subtitle,
 * HUD, finish and motion values from here instead of hard-coding them.
 * Start point: docs/research/nasa-ep04/style.md; frame-sampled colors win over the
 * description's values. Sizes are px at 1920x1080; durations are frames at 30fps.
 * Motion values were set by the 0:04-0:09 sample shot (#64); see the episode README.
 * `stripe` is listed left to right as in the subtitle strip (blue, gold, orange, red);
 * horizontal bands use it reversed, red on top. Sampled at reference 0:06 and 0:12.
 * firstChapter adds #66 reference-frame measurements without changing the sample.
 * Proposal-study additions are measured in reference frames 15.5, 19.5 and 25.5s
 * at 852x480, scaled to 1920x1080. TODO(design): confirm the sampled paper/camera
 * geometry and texture opacity; annotation paths use conservative SVG curves.
 * #68 adds wormStudy geometry measured at reference 32, 35.8, 40 and 44s;
 * TODO(design): confirm sampled geometry, stage-2 separation and red trace centerlines.
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

export const proposal = {
  clock: {
    left: 524,
    top: 334,
    width: 872,
    height: 412,
    radius: 8,
    border: 1,
    labelLeft: 56,
    labelTop: 42,
    digitTop: 94,
    digitWidth: 174,
    digitHeight: 266,
    digitGap: 22,
    digitSize: 198,
    seamWidth: 3.2,
    screwInset: 20,
    screwSize: 10,
    screwRotation: 45,
    scrambleFrames: 45,
    stepFrames: 3,
    stopStaggerFrames: 3,
  },
  paper: {
    width: 1720,
    height: 1000,
    rotation: -1,
    textureOpacity: 0.55,
    shadowY: 12,
    shadowBlur: 48,
    close: { left: 230, top: 146, scale: 2.1 },
    wide: { left: 100, top: 35, scale: 1 },
    badge: { left: 78, top: 75, width: 242, height: 202 },
    year: { left: 324, top: 144, size: 60 },
    insignia: { left: 324, top: 220, size: 12 },
    nickname: { left: 324, top: 246, size: 48 },
    circle: { left: 80, top: 64, width: 240, height: 232 },
    registrationInset: 42,
    registrationRadius: 16,
    registrationArm: 28,
    ruleWidth: 1,
    gridStroke: 1.6,
    gridOpacity: 0.35,
    grid: { left: 160, top: 330, width: 1320, height: 552, cell: 54 },
    logotype: { left: 100, baseline: 430, size: 342 },
    documentCode: { left: 1100, top: 270, size: 12 },
    title: {
      left: 1250,
      top: 875,
      width: 420,
      height: 88,
      row: 28,
      yearWidth: 136,
      padding: 12,
    },
  },
  tape: {
    width: 150,
    height: 58,
    opacity: 0.78,
    corners: [
      { left: -32, top: 4, rotation: -38 },
      { left: 1615, top: 2, rotation: 36 },
      { left: -24, top: 948, rotation: 35 },
      { left: 1617, top: 946, rotation: -34 },
    ],
    edge: "polygon(0% 9%, 3% 0%, 7% 6%, 10% 0%, 94% 0%, 97% 7%, 100% 4%, 97% 26%, 100% 35%, 97% 58%, 100% 72%, 96% 95%, 92% 91%, 88% 100%, 6% 100%, 3% 91%, 0% 95%, 3% 70%, 0% 60%, 3% 36%)",
  },
} as const;

export const wormStudy = {
  close: { left: -300, top: -250, scale: 1.26 },
  quoteCamera: { left: -1880, top: 210, scale: 2.1 },
  rocketCamera: { left: -300, top: -95, scale: 1.26 },
  finishCamera: { left: 100, top: -35, scale: 1 },
  logotype: {
    left: 100,
    top: 160,
    width: 1200,
    sourceWidth: 508.204,
    sourceHeight: 141.732,
    crossbars: [
      { x: 177, y: 80, width: 51, height: 12 },
      { x: 414, y: 80, width: 51, height: 12 },
    ],
    firstAOffset: -236.917,
    aApices: [202.224, 439.141],
    traceWidth: 34,
    traces: [
      "M 14.592 138.533 V 37.033 C 14.592 7 53 7 60 37 L 78 105 C 86 136 122.3 136 122.3 104.7 V 3.2",
      "M 148.245 138.533 L 183.06 28 C 190 9 214 9 221.39 28 L 250.97 124.2",
      "M 370.614 17.534 H 304 C 260 17.534 260 71 304 71 H 330 C 374 71 374 124.2 330 124.2 H 250.97",
      "M 385.16 138.533 L 420 28 C 427 9 451 9 458.3 28 L 493.12 138.533",
    ],
  },
  quote: {
    left: 1040,
    top: 36,
    width: 650,
    height: 228,
    padding: 18,
    size: 32,
    lineHeight: 1.13,
    underline: { left: 14, top: 114, width: 334, height: 18 },
  },
  rocket: { width: 52, height: 152, gapAbove: 126, offsetX: 72 },
  arrow: { width: 64, height: 128, gapAbove: 12 },
  nickname: { left: 100, top: 550, size: 18 },
} as const;

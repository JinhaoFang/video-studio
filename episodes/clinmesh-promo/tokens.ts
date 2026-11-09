/**
 * Visual, typographic, finish and timing tokens for ClinMesh promo.
 * Matches ClinMesh dark theme CSS variables in packages/ui/src/styles.css and
 * enforces readable pixel heights (>=56px primary, >=32px secondary) at 1920x1080.
 */
export const promoColor = {
  stageBg: "#121210",
  stageBgAlt: "#151517",
  stageSurface: "#18191C",
  cardBg: "#232324",
  cardElevated: "#2A2B2E",
  cardInset: "#181A20",
  fg: "#F9FAFB",
  fgMuted: "#CFD3D6",
  fgDim: "#8A9099",
  stageAccent: "#7C86FF",
  info: "#8DBBFF",
  infoDeep: "#1764C0",
  success: "#7DDBA4",
  warning: "#F4CA7B",
  destructive: "#FF9B9B",
  border: "rgba(255, 255, 255, 0.12)",
  borderStrong: "rgba(255, 255, 255, 0.22)",
  clinmeshGlowShadow:
    "0 0 0 1.5px rgba(141, 187, 255, 0.44), 0 0 24px rgba(141, 187, 255, 0.22)",
  cardShadow: "0 24px 64px rgba(0, 0, 0, 0.54)",
  subtitleBg: "rgba(16, 17, 20, 0.86)",
} as const;

export const promoRadius = {
  control: 6,
  card: 8,
} as const;

export const promoSubtitle = {
  bottom: 36,
  height: 60,
  paddingX: 26,
  stripeWidth: 6,
  fontSize: 35,
  expandFrames: 6,
  collapseFrames: 6,
  holdAfterFrames: 8,
  joinGapFrames: 10,
  stripKeepGapFrames: 26,
  stripFadeFrames: 6,
} as const;

export const promoFinish = {
  vignetteInnerPct: 56,
  vignetteOpacity: 0.5,
  grainOpacity: 0.045,
} as const;

export const BREATHER_DURATION_F = 52;
export const OUTPUT_AUDIO_OFFSET_F = 0.21;
export const BGM_STEADY_VOLUME = 0.46;
export const BGM_FADE_IN_F = 36;
export const BGM_FADE_OUT_F = 60;

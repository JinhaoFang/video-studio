/**
 * 本期令牌：色彩剧本（episodes/after-rain/art.md 与小样 contract.md 第 6 节）、线条、设定样张底色、摄影后期默认值。
 * 镜头、底图与引擎只从这里取色，不写散落的色值。
 * 小样既有的导出字段（ink、darkest、defaultPost、rain、dusk、warm、sheet）保持兼容，新增正片各场和机位色值；麻雀和鸟群的色值在 tokens-sparrow.ts。
 */
import type { Post } from "../../src/kit/engine/post-settings.ts";

export const ink = {
  color: "#3a2a28",
  minPx: 1.6,
  maxPx: 3.2,
  boilMinPx: 0.3,
  boilMaxPx: 0.8,
  supersample: 2,
};

export const darkest = "#1f1c2b";

export const darkestByMood = {
  rain: "#1c1e2c",
  dusk: "#1f1c2b",
  lowDusk: "#221c28",
  twilight: "#1f1b30",
} as const;

export const defaultPost: Post = {
  darkest,
  softFocus: 0.35,
  softRadius: 6,
  glowThreshold: 0.72,
  glow: 0.32,
  aberration: 1.6,
  vignette: 0.26,
  vignetteInner: 0.45,
  lift: 1,
  knee: 0.8,
  ceiling: 0.965,
  grain: 0.05,
  grainHighlight: 0.012,
  seed: 152,
};

export const rain = {
  sky: ["#4a5878", "#6c7690", "#8f97ab"],
  cloud: { dark: "#3c4560", mid: "#6b7590", edge: "#a9b0c2" },
  mountain: "#56677c",
  paddyWater: "#7d8aa0",
  paddyBack: "#4f6650",
  hedge: "#3d5244",
  eavesDark: "#2f2630",
  wood: "#4a3b3a",
  pole: "#8a8a6a",
  poleShadow: "#5a5a52",
  yardWet: "#5a5a64",
};

export const dusk = {
  cloudGap: ["#fbe7b5", "#f6d58e"],
  cloud: { edge: "#f3c48c", warm: "#e59a6b", shadow: "#7a6e93" },
  paddyLit: ["#d9c56f", "#b7b25a"],
  waterGlint: "#f4d48a",
  mountain: "#7f7f9a",
  shadowViolet: "#5a5780",
  shadowTeal: "#40606a",
  eavesBounce: "#3a2e36",
  yardLit: "#8a7a62",
};

export const warm = {
  bokeh: ["#e9c27c", "#c99a6a", "#7c8a6a"],
  backSide: "#6b6a8e",
  rim: "#ffe3a6",
  lowRim: "#f2c98a",
  dropHighlight: "#fff6e0",
};

export const houseRain = {
  sky: "#4f5b78",
  lightningSky: "#8e97b0",
  trees: "#333f3e",
  roof: "#3b4157",
  eavesDark: "#29242f",
  wall: "#5d5c6a",
  yard: "#424656",
  puddle: "#6c7792",
  pole: "#7b785a",
} as const;

export const houseTwilight = {
  skyHigh: "#6f78a3",
  skyBelt: "#b39ab2",
  earthShadow: "#5c6388",
  trees: "#2f3040",
  roof: "#3f3a55",
  eavesDark: "#2a2638",
  wall: "#86757d",
  lamp: "#f2b25e",
  lampGlow: "#e3a24a",
  yard: "#3a3a52",
  pole: "#2e2a3a",
  titleInk: "#3a2a28",
  seal: "#b0473a",
  sealText: "#efe4cf",
} as const;

export const houseTakeoff = {
  roof: "#8a8585",
  wallShade: "#6a6488",
  wallLit: "#e2c8a1",
  doorwayDark: "#352c3c",
  veranda: "#b89a78",
  pole: "#cbb06c",
} as const;

export const lowYard = {
  skyS4: "#dcd6c8",
  skyS6: "#efe0bc",
  hedge: "#3f5245",
  mudS4: "#7d6a55",
  mudS6: "#8a7a62",
  mudGlint: "#d9c08a",
  shadow: "#4e4358",
  puddleSky: "#d4d8dc",
  shoeBacklit: "#383e52",
  basket: "#7c6670",
} as const;

export const paddyWide = {
  skyCool: "#a7a6c4",
  skyWarm: "#f2c98a",
  mist: "#b49aa8",
  paddyFar: "#ecd08c",
  paddyNear: "#d9b45a",
  rowShadow: "#7a6a52",
  silhouette: "#2e2836",
} as const;

export const closeup = {
  s2: {
    eavesDark: "#2a2430",
    farMist: "#6a7591",
    hedgeYard: "#4a5853",
    pole: "#7b785a",
  },
  s5: {
    cloudCool: "#9a8fb0",
    skyWarm: "#f0d6a0",
    hedge: "#4a5a4a",
    pole: "#6d6a7a",
  },
  s7: {
    skyCool: "#a9a3bd",
    skyWarm: "#ead7ad",
    hedge: "#4a5a4a",
  },
  s8Start: {
    bokehBright: "#e9c27c",
    bokehMid: "#c99a6a",
    green: "#7c8a6a",
  },
  s8End: {
    bokehBright: "#eab06a",
    bokehMid: "#c98a5a",
    green: "#7d7f5c",
  },
  s9: {
    skyCool: "#b9a8b8",
    skyWarm: "#e8c79a",
    trees: "#57605a",
  },
} as const;

export const props = {
  pole: {
    rain: { lit: "#8b8b6c", shade: "#55556b" },
    dusk: { lit: "#cbbc80", shade: "#6d6a7a" },
    lowDusk: { lit: "#cbb06c", shade: "#68647a" },
    twilight: { lit: "#786756", shade: "#47435d" },
  },
} as const;

export const sheet = {
  ground: "#e4ddcf",
  guide: "#cdbfae",
  shadow: "#c9bdb0",
};

/**
 * 本期令牌：色彩剧本（contract.md 第 6 节）、线条、设定样张底色。镜头和引擎只从这里取色，不写散落的色值。
 * 设定样张的标准底色和参考线色由设计负责人在 #152 定。
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
};

export const dusk = {
  cloudGap: ["#fbe7b5", "#f6d58e"],
  cloud: { edge: "#f3c48c", warm: "#e59a6b", shadow: "#7a6e93" },
  paddyLit: ["#d9c56f", "#b7b25a"],
  waterGlint: "#f4d48a",
  mountain: "#7f7f9a",
  shadowViolet: "#5a5780",
  shadowTeal: "#40606a",
};

export const warm = {
  bokeh: ["#e9c27c", "#c99a6a", "#7c8a6a"],
  backSide: "#6b6a8e",
  rim: "#ffe3a6",
  dropHighlight: "#fff6e0",
};

export const sparrow = {
  crown: { lit: "#8a4b2f", shade: "#5e3328" },
  cheek: { lit: "#efe4cf", shade: "#b8adb4" },
  patch: { lit: "#2c2226", shade: "#241d24" },
  mantle: { lit: "#7a5a3c", shade: "#503b36" },
  streak: { lit: "#4a3528", shade: "#382a2a" },
  wingBar: { lit: "#e7d8b8", shade: "#a8a0a8" },
  belly: { lit: "#cfc3ad", shade: "#918aa0" },
  beak: { lit: "#3a2f2c", shade: "#2a2326" },
  foot: { lit: "#b88c78", shade: "#80666a" },
  eye: "#1c1618",
  glint: "#fff6e0",
};

export const sheet = {
  ground: "#e4ddcf",
  guide: "#cdbfae",
  shadow: "#c9bdb0",
};

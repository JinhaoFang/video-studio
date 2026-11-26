/** 摄影后期的参数集和默认值（不依赖浏览器，供镜头接口和 Node 侧类型检查引用）；后期链本身在 post.ts。 */
export type Post = {
  softFocus: number;
  softRadius: number;
  glowThreshold: number;
  glow: number;
  aberration: number;
  vignette: number;
  vignetteInner: number;
  lift: number;
  knee: number;
  ceiling: number;
  grain: number;
  grainHighlight: number;
  seed: number;
};

export const defaultPost: Post = {
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

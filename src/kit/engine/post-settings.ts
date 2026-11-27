/** WebGL 摄影参数。调用方传入本期默认值，镜头通过 Partial<Post> 覆盖。待定事项：无。 */
export type Post = {
  darkest: string;
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

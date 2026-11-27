/**
 * 《雨后》各场的摄影后期参数与最暗色（严格对照 art.md「各场的后期参数」）。
 * 以 tokens.ts 的 defaultPost 为基准；第 3 镜在第 30–100 帧之间从雨色参数（含黑位）平滑过渡到 defaultPost。
 * 供全片装配按镜与按帧解析后期参数，并在 s11→s12 叠化期间插值两场参数；#192 负责最终微调。
 * 待定事项：无。
 */
import type { Post } from "../../src/kit/engine/post-settings.ts";
import { ease, mix, progress } from "../../src/kit/engine/timing.ts";
import { darkestByMood, defaultPost } from "./tokens.ts";

const mixHex = (a: string, b: string, t: number): string => {
  const u = Math.max(0, Math.min(1, t));
  if (u <= 0) return a;
  if (u >= 1) return b;
  const ch = (s: string, offset: number) => parseInt(s.slice(offset, offset + 2), 16);
  const hex = (n: number) => Math.round(n).toString(16).replace(/^(.)$/, "0$1");
  return `#${hex(mix(ch(a, 1), ch(b, 1), u))}${hex(mix(ch(a, 3), ch(b, 3), u))}${hex(mix(ch(a, 5), ch(b, 5), u))}`;
};

export type MoodId = "rain" | "dusk" | "sunbathe" | "lowDusk" | "twilight";

export const moodPostOverrides: Record<MoodId, Partial<Post>> = {
  rain: {
    darkest: darkestByMood.rain,
    softFocus: 0.45,
    glow: 0.18,
    glowThreshold: 0.8,
    vignette: 0.3,
  },
  dusk: {},
  sunbathe: {
    darkest: darkestByMood.lowDusk,
    glow: 0.45,
    glowThreshold: 0.64,
    softFocus: 0.4,
  },
  lowDusk: {
    darkest: darkestByMood.lowDusk,
    glow: 0.38,
    glowThreshold: 0.68,
  },
  twilight: {
    darkest: darkestByMood.twilight,
    glow: 0.22,
    glowThreshold: 0.8,
    grain: 0.07,
    vignette: 0.32,
  },
};

export const PADDY_WIDE_POST: Partial<Post> = {
  glowThreshold: 0.86,
  glow: 0.3,
  softFocus: 0.2,
};

export const resolvePost = (override: Partial<Post> = {}): Post => ({
  ...defaultPost,
  ...override,
});

export const moodPosts: Record<MoodId, Post> = {
  rain: resolvePost(moodPostOverrides.rain),
  dusk: resolvePost(moodPostOverrides.dusk),
  sunbathe: resolvePost(moodPostOverrides.sunbathe),
  lowDusk: resolvePost(moodPostOverrides.lowDusk),
  twilight: resolvePost(moodPostOverrides.twilight),
};

export const mixPost = (a: Post, b: Post, t: number): Post => {
  const u = Math.max(0, Math.min(1, t));
  return {
    darkest: mixHex(a.darkest, b.darkest, u),
    softFocus: mix(a.softFocus, b.softFocus, u),
    softRadius: mix(a.softRadius, b.softRadius, u),
    glowThreshold: mix(a.glowThreshold, b.glowThreshold, u),
    glow: mix(a.glow, b.glow, u),
    aberration: mix(a.aberration, b.aberration, u),
    vignette: mix(a.vignette, b.vignette, u),
    vignetteInner: mix(a.vignetteInner, b.vignetteInner, u),
    lift: mix(a.lift, b.lift, u),
    knee: mix(a.knee, b.knee, u),
    ceiling: mix(a.ceiling, b.ceiling, u),
    grain: mix(a.grain, b.grain, u),
    grainHighlight: mix(a.grainHighlight, b.grainHighlight, u),
    seed: a.seed,
  };
};

export const LIGHT_BREAK_POST_START = 30;
export const LIGHT_BREAK_POST_END = 100;

export const postForShot = (
  shotId: string,
  localFrame: number,
  shotOverride?: Partial<Post>,
): Post => {
  let base: Post;
  switch (shotId) {
    case "s01":
    case "s02":
      base = moodPosts.rain;
      break;
    case "s03": {
      const t = ease(
        progress(localFrame, LIGHT_BREAK_POST_START, LIGHT_BREAK_POST_END),
        1.4,
        1.4,
      );
      base = mixPost(moodPosts.rain, moodPosts.dusk, t);
      break;
    }
    case "s04":
    case "s05":
    case "s06":
    case "s07":
      base = moodPosts.dusk;
      break;
    case "s08":
      base = moodPosts.sunbathe;
      break;
    case "s09":
    case "s10":
      base = moodPosts.lowDusk;
      break;
    case "s11":
      base = { ...moodPosts.lowDusk, ...PADDY_WIDE_POST };
      break;
    case "s12":
      base = moodPosts.twilight;
      break;
    default:
      base = defaultPost;
      break;
  }
  return shotOverride ? { ...base, ...shotOverride } : base;
};

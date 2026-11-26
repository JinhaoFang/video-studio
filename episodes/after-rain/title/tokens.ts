/**
 * 片名与印章令牌：复用本期 ../tokens.ts 的墨色（#3a2a28）与白文字口色（#efe4cf），
 * 补充 art.md「片名与印章的颜色」和第 12 镜暮色分层与后期参数。
 * 未直接改写 ../tokens.ts，避免破坏 pure-code-sample/data/generated.json 的输入哈希并减少与并行工单冲突；待合入时由设计负责人统一归并。
 */
import type { Post } from "../../../src/kit/engine/post-settings.ts";
import { defaultPost, ink, sparrow } from "../tokens.ts";

export const titlePalette = {
  ink: ink.color,
  paste: "#b0473a",
  carve: sparrow.cheek.lit,
} as const;

export const twilightSky = {
  high: "#6f78a3",
  band: "#b39ab2",
  earthShadow: "#5c6388",
  horizon: "#2f3040",
  darkest: "#1f1b30",
} as const;

export const twilightPost: Post = {
  ...defaultPost,
  darkest: twilightSky.darkest,
  glow: 0.22,
  glowThreshold: 0.8,
  grain: 0.07,
  vignette: 0.32,
};

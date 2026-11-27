/**
 * 片名与印章令牌：复用 ../tokens.ts 的墨色（#3a2a28）与 defaultPost，
 * 在本文件独立定义印泥（#b0473a）、白文字口（#efe4cf）与第 12 镜暮色分层及后期参数（art.md 第 12 镜）。
 * 不引用已移除的 sparrow 色值，也不改动 ../tokens.ts。待定事项：无。
 */
import type { Post } from "../../../src/kit/engine/post-settings.ts";
import { defaultPost, ink } from "../tokens.ts";

export const titlePalette = {
  ink: ink.color,
  paste: "#b0473a",
  carve: "#efe4cf",
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

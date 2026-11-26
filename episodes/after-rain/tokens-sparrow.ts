/**
 * 麻雀与远处鸟群的色值令牌（#180），全部取自 episodes/after-rain/art.md「按光照分的色指定」。
 * 导出五套麻雀色板（雨色·湿、夕光·湿、夕光·干、低夕光·干、暮色）、轮廓光色、眼睛/水光色、远处鸟群剪影底色与两档金边，
 * 以及色板插值与按光照解析色板的纯函数；麻雀与鸟群模块只从本文件取色，不再引用 tokens.ts 的 sparrow 一节。
 * 待定事项：无。
 */
import type { Tone } from "../../src/kit/engine/cel.ts";

export type SparrowPalette = {
  crown: Tone;
  cheek: Tone;
  patch: Tone;
  mantle: Tone;
  streak: Tone;
  wingBar: Tone;
  belly: Tone;
  beak: Tone;
  foot: Tone;
};

export type SparrowLightPreset = "rain" | "dusk" | "lowDusk" | "twilight";

export const sparrowPalettes: Record<
  "rainWet" | "duskWet" | "duskDry" | "lowDuskDry" | "twilight",
  SparrowPalette
> = {
  rainWet: {
    crown: { lit: "#4f2d2c", shade: "#3a232b" },
    cheek: { lit: "#95979a", shade: "#7b7688" },
    patch: { lit: "#211d2b", shade: "#201c2b" },
    mantle: { lit: "#453530", shade: "#32272e" },
    streak: { lit: "#2c232b", shade: "#26202b" },
    wingBar: { lit: "#8f8e86", shade: "#6e6c7d" },
    belly: { lit: "#7d7e7d", shade: "#5d5b77" },
    beak: { lit: "#25212b", shade: "#211d2b" },
    foot: { lit: "#6d5554", shade: "#51414c" },
  },
  duskWet: {
    crown: { lit: "#71392c", shade: "#49272b" },
    cheek: { lit: "#d9cdb7", shade: "#9f949c" },
    patch: { lit: "#241e2b", shade: "#211c2b" },
    mantle: { lit: "#624533", shade: "#3d2d2f" },
    streak: { lit: "#39282b", shade: "#2c222b" },
    wingBar: { lit: "#d0c0a0", shade: "#8f8790" },
    belly: { lit: "#b7aa95", shade: "#787188" },
    beak: { lit: "#2d252b", shade: "#231e2b" },
    foot: { lit: "#9f7362", shade: "#685055" },
  },
  duskDry: {
    crown: { lit: "#8a4b2f", shade: "#5e3328" },
    cheek: { lit: "#efe4cf", shade: "#b8adb4" },
    patch: { lit: "#2c2226", shade: "#241d24" },
    mantle: { lit: "#7a5a3c", shade: "#503b36" },
    streak: { lit: "#4a3528", shade: "#382a2a" },
    wingBar: { lit: "#e7d8b8", shade: "#a8a0a8" },
    belly: { lit: "#cfc3ad", shade: "#918aa0" },
    beak: { lit: "#3a2f2c", shade: "#2a2326" },
    foot: { lit: "#b88c78", shade: "#80666a" },
  },
  lowDuskDry: {
    crown: { lit: "#8a472e", shade: "#5a312b" },
    cheek: { lit: "#efd5ad", shade: "#b0a4b4" },
    patch: { lit: "#2c212b", shade: "#241d2b" },
    mantle: { lit: "#7a5437", shade: "#4d3836" },
    streak: { lit: "#4a322b", shade: "#36292b" },
    wingBar: { lit: "#e7ca9a", shade: "#a097a8" },
    belly: { lit: "#cfb791", shade: "#8b82a0" },
    beak: { lit: "#3a2d2c", shade: "#29222b" },
    foot: { lit: "#b88366", shade: "#7a616a" },
  },
  twilight: {
    crown: { lit: "#532d2c", shade: "#3f252b" },
    cheek: { lit: "#8e7c86", shade: "#766b86" },
    patch: { lit: "#231e2b", shade: "#211c2b" },
    mantle: { lit: "#4a3432", shade: "#372931" },
    streak: { lit: "#31242b", shade: "#2a212b" },
    wingBar: { lit: "#897678", shade: "#6c637e" },
    belly: { lit: "#7b6a71", shade: "#5e5578" },
    beak: { lit: "#29222b", shade: "#231e2b" },
    foot: { lit: "#6d4d51", shade: "#534052" },
  },
};

export const sparrowCommon = {
  eye: "#1c1618",
  glint: "#fff6e0",
  backSideTint: "#6b6a8e",
  silhouetteFill: "#241d24",
} as const;

export const sparrowRim: Record<SparrowLightPreset, string | null> = {
  rain: "#a9b0c2",
  dusk: "#ffe3a6",
  lowDusk: "#f2c98a",
  twilight: null,
};

export const flockColors = {
  bodies: ["#3a3040", "#43384a", "#4a3c44", "#3e3640", "#463a48"] as const,
  rimNear: "#ffe3a6",
  rimFar: "#f2c98a",
  wire: "#2e2836",
} as const;

export const mixHex = (a: string, b: string, t: number): string => {
  const u = Math.max(0, Math.min(1, t));
  if (u <= 0) return a;
  if (u >= 1) return b;
  const r = Math.round(
    parseInt(a.slice(1, 3), 16) +
      (parseInt(b.slice(1, 3), 16) - parseInt(a.slice(1, 3), 16)) * u,
  );
  const g = Math.round(
    parseInt(a.slice(3, 5), 16) +
      (parseInt(b.slice(3, 5), 16) - parseInt(a.slice(3, 5), 16)) * u,
  );
  const bl = Math.round(
    parseInt(a.slice(5, 7), 16) +
      (parseInt(b.slice(5, 7), 16) - parseInt(a.slice(5, 7), 16)) * u,
  );
  const hex = (n: number) => n.toString(16).replace(/^(.)$/, "0$1");
  return `#${hex(r)}${hex(g)}${hex(bl)}`;
};

const mixTone = (a: Tone, b: Tone, t: number): Tone => ({
  lit: mixHex(a.lit, b.lit, t),
  shade: mixHex(a.shade, b.shade, t),
});

export const mixSparrowPalette = (
  a: SparrowPalette,
  b: SparrowPalette,
  t: number,
): SparrowPalette => ({
  crown: mixTone(a.crown, b.crown, t),
  cheek: mixTone(a.cheek, b.cheek, t),
  patch: mixTone(a.patch, b.patch, t),
  mantle: mixTone(a.mantle, b.mantle, t),
  streak: mixTone(a.streak, b.streak, t),
  wingBar: mixTone(a.wingBar, b.wingBar, t),
  belly: mixTone(a.belly, b.belly, t),
  beak: mixTone(a.beak, b.beak, t),
  foot: mixTone(a.foot, b.foot, t),
});

export const paletteForLight = (
  preset: SparrowLightPreset,
  wetness: number,
): SparrowPalette => {
  const w = Math.max(0, Math.min(1, wetness));
  if (preset === "rain") return sparrowPalettes.rainWet;
  if (preset === "twilight") return sparrowPalettes.twilight;
  if (preset === "lowDusk") {
    return w > 0
      ? mixSparrowPalette(sparrowPalettes.lowDuskDry, sparrowPalettes.duskWet, w)
      : sparrowPalettes.lowDuskDry;
  }
  return mixSparrowPalette(sparrowPalettes.duskDry, sparrowPalettes.duskWet, w);
};

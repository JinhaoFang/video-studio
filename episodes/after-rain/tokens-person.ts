/**
 * 走过院子的人和随身道具的色指定：按 art.md「按光照分的色指定」里人和道具一节逐格录入，
 * 含雨色、夕光、低夕光、暮色四档的受光/阴影色、各档轮廓光色，以及第 11 镜大远景小人影的底色与稻田背景样条色。
 * 供 person.ts 和 sheets/PersonSheet.tsx 使用，镜头不写散落的色值。
 * 待定事项：TODO(design) 远处小人影的斗笠在 art.md 未单独列色，暂沿用竹篮（basket）同族色。
 */
import type { Tone } from "../../src/kit/engine/cel.ts";

export type PersonLight = "rain" | "dusk" | "lowDusk" | "twilight";

export type PersonPalette = {
  boot: Tone;
  mud: Tone;
  trousers: Tone;
  skin: Tone;
  basket: Tone;
  rim?: string;
};

export const personPalettes: Record<PersonLight, PersonPalette> = {
  rain: {
    boot: { lit: "#4a5d51", shade: "#303649" },
    mud: { lit: "#5f5246", shade: "#3e3748" },
    trousers: { lit: "#43517d", shade: "#2f3353" },
    skin: { lit: "#9b837d", shade: "#776275" },
    basket: { lit: "#90805f", shade: "#605262" },
    rim: "#a9b0c2",
  },
  dusk: {
    boot: { lit: "#6a7d5e", shade: "#3a4152" },
    mud: { lit: "#8a6f50", shade: "#4e4350" },
    trousers: { lit: "#5f6d94", shade: "#383d5e" },
    skin: { lit: "#e2b294", shade: "#9a7a86" },
    basket: { lit: "#d2ad70", shade: "#7c6670" },
    rim: "#ffe3a6",
  },
  lowDusk: {
    boot: { lit: "#6a7551", shade: "#383e52" },
    mud: { lit: "#8a6846", shade: "#4b4050" },
    trousers: { lit: "#5f667d", shade: "#363a5e" },
    skin: { lit: "#e2a77d", shade: "#937386" },
    basket: { lit: "#d2a25f", shade: "#766170" },
    rim: "#f2c98a",
  },
  twilight: {
    boot: { lit: "#414543", shade: "#2b2c42" },
    mud: { lit: "#533e3b", shade: "#352d41" },
    trousers: { lit: "#3b3d62", shade: "#2a2a4a" },
    skin: { lit: "#866162", shade: "#634c65" },
    basket: { lit: "#7c5f4d", shade: "#514056" },
  },
};

export const distantPersonColors = {
  silhouette: "#2e2836",
  trousers: "#363a5e",
  boot: "#383e52",
  basket: "#766170",
  hat: "#766170",
  hatLit: "#d2a25f",
  rimNear: "#ffe3a6",
  rimFar: "#f2c98a",
  paddySkyWarm: "#f2c98a",
  paddySkyCool: "#a7a6c4",
  paddyMist: "#b49aa8",
  paddyFar: "#ecd08c",
  paddyNear: "#d9b45a",
  paddyShadow: "#7a6a52",
};

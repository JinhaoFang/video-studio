/**
 * NASA-punk font families loaded through @remotion/google-fonts.
 * Noto Sans SC stands in for Source Han Sans and Inter Bold for Helvetica.
 * Import `font` for family names; loading starts when this module is imported.
 */
import { loadFont as loadArchivo } from "@remotion/google-fonts/Archivo";
import { loadFont as loadGeist } from "@remotion/google-fonts/Geist";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadNotoSansSC } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadSpaceMono } from "@remotion/google-fonts/SpaceMono";

export const font = {
  display: loadArchivo("normal", { weights: ["800"], subsets: ["latin"] })
    .fontFamily,
  body: loadGeist("normal", { weights: ["400"], subsets: ["latin"] })
    .fontFamily,
  helvetica: loadInter("normal", { weights: ["700"], subsets: ["latin"] })
    .fontFamily,
  mono: loadSpaceMono("normal", { weights: ["400", "700"], subsets: ["latin"] })
    .fontFamily,
  cjk: loadNotoSansSC("normal", {
    weights: ["500"],
    subsets: ["chinese-simplified", "latin"],
  }).fontFamily,
} as const;

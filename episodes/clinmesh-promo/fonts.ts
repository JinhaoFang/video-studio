/**
 * Google Fonts loader for ClinMesh promo: Noto Sans SC for UI/captions, Noto Serif SC
 * for editorial wordmarks and breather cards, Inter for Latin labels, and JetBrains Mono
 * for tabular clinical metrics and ROI coordinates.
 */
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadJetBrainsMono } from "@remotion/google-fonts/JetBrainsMono";
import { loadFont as loadNotoSansSC } from "@remotion/google-fonts/NotoSansSC";
import { loadFont as loadNotoSerifSC } from "@remotion/google-fonts/NotoSerifSC";

const sansCjk = loadNotoSansSC("normal", {
  weights: ["400", "500", "600", "700"],
  subsets: ["chinese-simplified", "latin"],
  ignoreTooManyRequestsWarning: true,
}).fontFamily;

const serifCjk = loadNotoSerifSC("normal", {
  weights: ["600", "700"],
  subsets: ["chinese-simplified", "latin"],
  ignoreTooManyRequestsWarning: true,
}).fontFamily;

const interLatin = loadInter("normal", {
  weights: ["500", "600", "700"],
  subsets: ["latin"],
}).fontFamily;

const monoLatin = loadJetBrainsMono("normal", {
  weights: ["400", "600", "700"],
  subsets: ["latin"],
}).fontFamily;

export const promoFont = {
  sans: `${interLatin}, ${sansCjk}, "PingFang SC", "Microsoft YaHei", sans-serif`,
  serif: `${serifCjk}, Georgia, "Times New Roman", serif`,
  mono: `${monoLatin}, "SFMono-Regular", Consolas, monospace`,
} as const;

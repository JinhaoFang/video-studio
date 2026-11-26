/**
 * 片名「雨后」与署名「遡游」印章的纯 Paper 渲染与布局计算（不依赖浏览器，Node 与浏览器共用）。
 * 已落定笔画与印章按不可变键缓存（不依赖帧序，确保同一帧两次渲染逐像素一致），控制每帧作画耗时远低于预算。
 * 供 canvas.ts（浏览器 Canvas 2D / Remotion）与 export-cover.ts（Node 透明底封面烘焙）共用。
 */
import {
  mixColor,
  paintCalligraphyStroke,
  paintDropDot,
  strokeProgressAt,
  type BrushStyle,
  type CalligraphyStroke,
} from "../../../src/kit/engine/calligraphy.ts";
import { over, paper, rgb, type Paper, type RGB } from "../../../src/kit/engine/paint.ts";
import { renderSeal, stampStateAt, type StampState } from "../../../src/kit/engine/seal.ts";
import { clamp01, ease, progress } from "../../../src/kit/engine/timing.ts";
import { buildTitleGeometry, suYouSealSpec } from "./glyphs.ts";
import {
  FADE_END_FRAME,
  FADE_START_FRAME,
  SEAL_SETTLE_FRAMES,
  SEAL_STAMP_FRAME,
  titleDropTimings,
  titleStrokeTimings,
} from "./timing.ts";
import { titlePalette, twilightSky } from "./tokens.ts";

export type TitleLayout = {
  centerX: number;
  topY: number;
  charSize: number;
  charGap: number;
  sealSize: number;
  sealGap: number;
};

export const defaultTitleLayout: TitleLayout = {
  centerX: 318,
  topY: 226,
  charSize: 168,
  charGap: 32,
  sealSize: 108,
  sealGap: 34,
};

export type TitleDrawOptions = {
  layout?: Partial<TitleLayout>;
  inkColor?: string;
  pasteColor?: string;
  carveColor?: string;
  fade?: boolean;
};

export type TitleFrameParts = {
  fadeAlpha: number;
  calligraphy: { x: number; y: number; art: Paper };
  seal: { cx: number; cy: number; art: Paper; state: StampState } | null;
};

const resolveLayout = (override?: Partial<TitleLayout>): TitleLayout => ({
  ...defaultTitleLayout,
  ...override,
});

const brushStyle = (charSize: number, inkHex: string): BrushStyle => ({
  color: rgb(inkHex),
  baseWidth: charSize * 0.092,
  bristles: 9,
  dry: 0.44,
  rough: 0.42,
  streak: 0.09,
  nibAngle: Math.PI * 0.24,
  oblique: 0.22,
  wobble: 0.072,
});

export const titleOpacityAt = (frame: number, enableFade = true): number => {
  if (!enableFade || frame < FADE_START_FRAME) return 1;
  if (frame >= FADE_END_FRAME) return 0;
  return 1 - ease(progress(frame, FADE_START_FRAME, FADE_END_FRAME), 1.2, 1.4);
};

export const twilightSkyColorAt = (yNorm: number): RGB => {
  const y = clamp01(yNorm);
  const high = rgb(twilightSky.high);
  const band = rgb(twilightSky.band);
  const earth = rgb(twilightSky.earthShadow);
  const horizon = rgb(twilightSky.horizon);
  if (y < 0.34) {
    const t = ease(y / 0.34, 0.85, 1.3);
    return mixColor(high, band, 0.25 + 0.75 * t);
  }
  if (y <= 0.56) {
    return band;
  }
  if (y <= 0.74) {
    const t = ease((y - 0.56) / 0.18, 1.1, 1.1);
    return mixColor(band, earth, t);
  }
  const t = ease((y - 0.74) / 0.26, 1.2, 1.0);
  return mixColor(earth, horizon, t);
};

const strokeCache = new Map<string, Paper>();
const sealCache = new Map<string, Paper>();

const boundsOfLayout = (layout: TitleLayout) => {
  const pad = Math.ceil(layout.charSize * 0.25);
  const x0 = Math.max(0, Math.floor(layout.centerX - layout.charSize * 0.65 - pad));
  const y0 = Math.max(0, Math.floor(layout.topY - pad));
  const width = Math.ceil(layout.charSize * 1.3 + pad * 2);
  const height = Math.ceil(layout.charSize * 2 + layout.charGap + pad * 2);
  return { x0, y0, width, height };
};

const shiftStroke = (s: CalligraphyStroke, ox: number, oy: number): CalligraphyStroke => ({
  ...s,
  nodes: s.nodes.map((n) => ({ ...n, x: n.x - ox, y: n.y - oy })),
});

const getFullStrokePaper = (
  stroke: CalligraphyStroke,
  style: BrushStyle,
  width: number,
  height: number,
  key: string,
): Paper => {
  const hit = strokeCache.get(key);
  if (hit) return hit;
  const p = paper(width, height);
  paintCalligraphyStroke(p, stroke, style, 1);
  strokeCache.set(key, p);
  return p;
};

const getSealPaper = (
  size: number,
  pasteHex: string,
  carveHex: string,
): Paper => {
  const key = `${size}:${pasteHex}:${carveHex}`;
  const hit = sealCache.get(key);
  if (hit) return hit;
  const rendered = renderSeal(suYouSealSpec, {
    size,
    pasteColor: rgb(pasteHex),
    carveColor: rgb(carveHex),
    mottleScale: 0.22,
    mottleAmount: 0.62,
    drySpots: 0.66,
    edgeRoughness: 0.015,
    carveRoughness: 0.36,
  });
  sealCache.set(key, rendered);
  return rendered;
};

const sealCenterOf = (layout: TitleLayout) => ({
  cx: layout.centerX,
  cy: layout.topY + layout.charSize * 2 + layout.charGap + layout.sealGap + layout.sealSize * 0.5,
});

const renderLocalCalligraphy = (
  frame: number,
  layout: TitleLayout,
  inkHex: string,
): { box: ReturnType<typeof boundsOfLayout>; art: Paper } => {
  const box = boundsOfLayout(layout);
  const style = brushStyle(layout.charSize, inkHex);
  const geom = buildTitleGeometry(
    layout.centerX,
    layout.topY,
    layout.charSize,
    layout.charGap,
  );
  const art = paper(box.width, box.height);
  const strokeTimingMap = new Map(titleStrokeTimings.map((t) => [t.id, t]));
  for (const stroke of geom.strokes) {
    const timing = strokeTimingMap.get(stroke.id);
    const p = timing ? strokeProgressAt(frame, timing) : 1;
    if (p <= 0) continue;
    const local = shiftStroke(stroke, box.x0, box.y0);
    if (p >= 1) {
      const key = `${stroke.id}:${layout.centerX}:${layout.topY}:${layout.charSize}:${layout.charGap}:${inkHex}`;
      over(art, getFullStrokePaper(local, style, box.width, box.height, key));
    } else {
      paintCalligraphyStroke(art, local, style, p);
    }
  }
  const dropTimingMap = new Map(titleDropTimings.map((t) => [t.id, t]));
  for (const drop of geom.drops) {
    const timing = dropTimingMap.get(drop.id);
    const localDrop = {
      ...drop,
      start: [drop.start[0] - box.x0, drop.start[1] - box.y0] as [number, number],
      nodes: drop.nodes.map((n) => ({ ...n, x: n.x - box.x0, y: n.y - box.y0 })),
    };
    if (timing) {
      if (frame >= timing.landFrame + (timing.settleFrames ?? 2)) {
        const fullStroke: CalligraphyStroke = {
          id: localDrop.id,
          nodes: localDrop.nodes,
          width: localDrop.width ?? style.baseWidth * 0.92,
          entry: "exposed",
          exit: "press",
          dry: 0.08,
          seed: localDrop.seed,
        };
        const dotStyle: BrushStyle = {
          ...style,
          rough: (style.rough ?? 0.42) * 0.45,
          wobble: (style.wobble ?? 0.072) * 0.5,
        };
        const key = `${drop.id}:${layout.centerX}:${layout.topY}:${layout.charSize}:${layout.charGap}:${inkHex}`;
        over(art, getFullStrokePaper(fullStroke, dotStyle, box.width, box.height, key));
      } else {
        paintDropDot(art, localDrop, style, frame, timing);
      }
    }
  }
  return { box, art };
};

export const renderTitleFrameParts = (
  frame: number,
  options: TitleDrawOptions = {},
): TitleFrameParts => {
  const layout = resolveLayout(options.layout);
  const inkHex = options.inkColor ?? titlePalette.ink;
  const pasteHex = options.pasteColor ?? titlePalette.paste;
  const carveHex = options.carveColor ?? titlePalette.carve;
  const fadeAlpha = titleOpacityAt(frame, options.fade ?? true);
  const { box, art } = renderLocalCalligraphy(frame, layout, inkHex);
  const state = stampStateAt(frame, SEAL_STAMP_FRAME, SEAL_SETTLE_FRAMES);
  const { cx, cy } = sealCenterOf(layout);
  const seal = state.visible
    ? { cx, cy, art: getSealPaper(layout.sealSize, pasteHex, carveHex), state }
    : null;
  return {
    fadeAlpha,
    calligraphy: { x: box.x0, y: box.y0, art },
    seal,
  };
};

const blitPaper = (dst: Paper, src: Paper, dx: number, dy: number) => {
  const ox = Math.round(dx);
  const oy = Math.round(dy);
  const a = dst.data;
  const b = src.data;
  for (let y = 0; y < src.height; y++) {
    const ty = oy + y;
    if (ty < 0 || ty >= dst.height) continue;
    for (let x = 0; x < src.width; x++) {
      const tx = ox + x;
      if (tx < 0 || tx >= dst.width) continue;
      const si = (y * src.width + x) * 4;
      const s = b[si + 3];
      if (s <= 0) continue;
      const di = (ty * dst.width + tx) * 4;
      const inv = 1 - s;
      a[di] = a[di] * inv + b[si];
      a[di + 1] = a[di + 1] * inv + b[si + 1];
      a[di + 2] = a[di + 2] * inv + b[si + 2];
      a[di + 3] = a[di + 3] * inv + s;
    }
  }
};

export const renderTitleCardPaper = (
  frame: number,
  width = 1920,
  height = 1080,
  options: TitleDrawOptions = {},
): Paper => {
  const out = paper(width, height);
  const parts = renderTitleFrameParts(frame, options);
  blitPaper(out, parts.calligraphy.art, parts.calligraphy.x, parts.calligraphy.y);
  if (parts.seal) {
    blitPaper(
      out,
      parts.seal.art,
      parts.seal.cx - parts.seal.art.width * 0.5,
      parts.seal.cy - parts.seal.art.height * 0.5,
    );
  }
  return out;
};

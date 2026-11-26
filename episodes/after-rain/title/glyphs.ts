/**
 * 《雨后》片名「雨后」行楷字骨与署名「遡游」小篆白文印字骨（全手写坐标，零字体文件）。
 * 笔顺严格遵守 GF 0023—2020《通用规范汉字笔顺规范》（「雨」印页 70：横、竖、横折钩、竖、四点左上→左下→右上→右下；「后」印页 27：撇、撇、横、竖、横折、横）。
 * 行楷笔法参照 docs/video/visual-style.md「行书与行楷」（故宫藏董其昌、刘墉藏锋折锋、杨凝式枯笔飞白）。
 * 印文「遡游」依 spec #168 修订记录与 docs/video/visual-style.md「篆书字形依据」：右列「遡」（《说文》卷十一上水部「泝」或体，从辵、朔声，段注引《蒹葭》作「遡游」），
 * 左列「游」（《说文》卷七上㫃部字头，从㫃汓声）。第 5 轮定稿：修正前两滴雨起落点至横盖下沿内侧，避免穿透横盖上沿。
 */
import type {
  BrushNode,
  CalligraphyStroke,
  DropDot,
} from "../../../src/kit/engine/calligraphy.ts";
import type { SealChip, SealSpec, SealStroke } from "../../../src/kit/engine/seal.ts";

type NormStroke = Omit<CalligraphyStroke, "nodes"> & {
  nodes: readonly BrushNode[];
};

type NormDrop = Omit<DropDot, "start" | "nodes"> & {
  start: readonly [number, number];
  nodes: readonly BrushNode[];
};

const YU_STROKES: readonly NormStroke[] = [
  {
    id: "yu-1-heng",
    entry: "hidden",
    exit: "press",
    dry: 0.28,
    width: 0.088,
    seed: 18301,
    nodes: [
      { x: 0.22, y: 0.156, pressure: 0.84, speed: 0.42 },
      { x: 0.505, y: 0.136, pressure: 0.78, speed: 0.74 },
      { x: 0.78, y: 0.122, pressure: 1.06, speed: 0.38 },
    ],
  },
  {
    id: "yu-2-shu-left",
    entry: "hidden",
    exit: "press",
    dry: 0.24,
    width: 0.088,
    seed: 18302,
    nodes: [
      { x: 0.145, y: 0.318, pressure: 0.94, speed: 0.38 },
      { x: 0.138, y: 0.545, pressure: 0.84, speed: 0.68 },
      { x: 0.134, y: 0.775, pressure: 0.92, speed: 0.42 },
    ],
  },
  {
    id: "yu-3-hengzhegou",
    entry: "hidden",
    exit: "hook",
    dry: 0.66,
    width: 0.094,
    seed: 18303,
    nodes: [
      { x: 0.165, y: 0.328, pressure: 0.84, speed: 0.48 },
      { x: 0.515, y: 0.292, pressure: 0.78, speed: 0.86 },
      { x: 0.862, y: 0.266, pressure: 1.12, speed: 0.32, corner: true },
      { x: 0.86, y: 0.545, pressure: 0.94, speed: 0.95 },
      { x: 0.846, y: 0.832, pressure: 1.08, speed: 0.38, corner: true },
      { x: 0.79, y: 0.788, pressure: 0.82, speed: 0.82 },
      { x: 0.746, y: 0.758, pressure: 0.5, speed: 0.94 },
    ],
  },
  {
    id: "yu-4-shu-mid",
    entry: "hidden",
    exit: "press",
    dry: 0.34,
    width: 0.092,
    seed: 18304,
    nodes: [
      { x: 0.496, y: 0.14, pressure: 0.92, speed: 0.34 },
      { x: 0.495, y: 0.48, pressure: 0.84, speed: 0.76 },
      { x: 0.491, y: 0.85, pressure: 0.96, speed: 0.44 },
    ],
  },
];

const YU_DROPS: readonly NormDrop[] = [
  {
    id: "yu-5-dot-tl",
    start: [0.295, 0.345],
    width: 0.078,
    seed: 18305,
    nodes: [
      { x: 0.268, y: 0.422, pressure: 0.34, speed: 0.5 },
      { x: 0.314, y: 0.464, pressure: 0.92, speed: 0.4 },
      { x: 0.346, y: 0.496, pressure: 1.0, speed: 0.28 },
    ],
  },
  {
    id: "yu-6-dot-bl",
    start: [0.292, 0.48],
    width: 0.084,
    seed: 18306,
    nodes: [
      { x: 0.246, y: 0.616, pressure: 0.36, speed: 0.5 },
      { x: 0.312, y: 0.662, pressure: 0.98, speed: 0.4 },
      { x: 0.358, y: 0.70, pressure: 1.08, speed: 0.28 },
    ],
  },
  {
    id: "yu-7-dot-tr",
    start: [0.642, 0.325],
    width: 0.076,
    seed: 18307,
    nodes: [
      { x: 0.616, y: 0.408, pressure: 0.34, speed: 0.5 },
      { x: 0.668, y: 0.448, pressure: 0.9, speed: 0.4 },
      { x: 0.704, y: 0.48, pressure: 0.98, speed: 0.28 },
    ],
  },
  {
    id: "yu-8-dot-br",
    start: [0.64, 0.46],
    width: 0.084,
    seed: 18308,
    nodes: [
      { x: 0.594, y: 0.594, pressure: 0.36, speed: 0.5 },
      { x: 0.652, y: 0.638, pressure: 0.96, speed: 0.4 },
      { x: 0.694, y: 0.674, pressure: 1.06, speed: 0.28 },
    ],
  },
];

const HOU_STROKES: readonly NormStroke[] = [
  {
    id: "hou-1-pie-top",
    entry: "hidden",
    exit: "taper",
    dry: 0.38,
    width: 0.09,
    seed: 18311,
    nodes: [
      { x: 0.745, y: 0.116, pressure: 0.98, speed: 0.36 },
      { x: 0.51, y: 0.15, pressure: 0.84, speed: 0.8 },
      { x: 0.27, y: 0.184, pressure: 0.48, speed: 0.92 },
    ],
  },
  {
    id: "hou-2-pie-left",
    entry: "hidden",
    exit: "taper",
    dry: 0.68,
    width: 0.096,
    seed: 18312,
    nodes: [
      { x: 0.278, y: 0.194, pressure: 1.0, speed: 0.34 },
      { x: 0.264, y: 0.435, pressure: 0.9, speed: 0.78 },
      { x: 0.214, y: 0.675, pressure: 0.78, speed: 0.96 },
      { x: 0.118, y: 0.875, pressure: 0.44, speed: 0.98 },
    ],
  },
  {
    id: "hou-3-heng-long",
    entry: "hidden",
    exit: "press",
    dry: 0.74,
    width: 0.092,
    seed: 18313,
    nodes: [
      { x: 0.268, y: 0.398, pressure: 0.92, speed: 0.42 },
      { x: 0.585, y: 0.362, pressure: 0.78, speed: 0.98 },
      { x: 0.892, y: 0.34, pressure: 1.08, speed: 0.58 },
    ],
  },
  {
    id: "hou-4-kou-shu",
    entry: "hidden",
    exit: "press",
    dry: 0.26,
    width: 0.084,
    seed: 18314,
    nodes: [
      { x: 0.382, y: 0.548, pressure: 0.92, speed: 0.38 },
      { x: 0.396, y: 0.682, pressure: 0.82, speed: 0.64 },
      { x: 0.408, y: 0.808, pressure: 0.88, speed: 0.42 },
    ],
  },
  {
    id: "hou-5-kou-hengzhe",
    entry: "hidden",
    exit: "press",
    dry: 0.38,
    width: 0.088,
    seed: 18315,
    nodes: [
      { x: 0.394, y: 0.554, pressure: 0.8, speed: 0.52 },
      { x: 0.59, y: 0.53, pressure: 0.76, speed: 0.8 },
      { x: 0.774, y: 0.506, pressure: 1.14, speed: 0.32, corner: true },
      { x: 0.756, y: 0.654, pressure: 0.92, speed: 0.76 },
      { x: 0.734, y: 0.794, pressure: 0.98, speed: 0.44 },
    ],
  },
  {
    id: "hou-6-kou-heng",
    entry: "hidden",
    exit: "press",
    dry: 0.3,
    width: 0.082,
    seed: 18316,
    nodes: [
      { x: 0.412, y: 0.794, pressure: 0.86, speed: 0.44 },
      { x: 0.574, y: 0.781, pressure: 0.8, speed: 0.72 },
      { x: 0.736, y: 0.772, pressure: 0.96, speed: 0.42 },
    ],
  },
];

const mapGlyphStroke = (
  stroke: NormStroke,
  left: number,
  top: number,
  size: number,
): CalligraphyStroke => ({
  id: stroke.id,
  entry: stroke.entry,
  exit: stroke.exit,
  dry: stroke.dry,
  width: (stroke.width ?? 0.09) * size,
  seed: stroke.seed,
  nodes: stroke.nodes.map((node) => ({
    ...node,
    x: left + node.x * size,
    y: top + node.y * size,
  })),
});

const mapGlyphDrop = (
  drop: NormDrop,
  left: number,
  top: number,
  size: number,
): DropDot => ({
  id: drop.id,
  width: (drop.width ?? 0.08) * size,
  seed: drop.seed,
  start: [left + drop.start[0] * size, top + drop.start[1] * size],
  nodes: drop.nodes.map((node) => ({
    ...node,
    x: left + node.x * size,
    y: top + node.y * size,
  })),
});

export type TitleGlyphGeometry = {
  strokes: CalligraphyStroke[];
  drops: DropDot[];
};

export const buildTitleGeometry = (
  centerX: number,
  topY: number,
  charSize: number,
  charGap: number,
): TitleGlyphGeometry => {
  const left = centerX - charSize * 0.5;
  const houTop = topY + charSize + charGap;
  return {
    strokes: [
      ...YU_STROKES.map((s) => mapGlyphStroke(s, left, topY, charSize)),
      ...HOU_STROKES.map((s) => mapGlyphStroke(s, left, houTop, charSize)),
    ],
    drops: YU_DROPS.map((d) => mapGlyphDrop(d, left, topY, charSize)),
  };
};

const SU_YOU_SEAL_STROKES: readonly SealStroke[] = [
  { points: [[0.60, 0.08], [0.572, 0.15], [0.538, 0.215]] },
  { points: [[0.60, 0.265], [0.572, 0.34], [0.538, 0.405]] },
  { points: [[0.57, 0.34], [0.568, 0.61]] },
  { points: [[0.535, 0.93], [0.742, 0.93], [0.955, 0.93]] },
  { points: [[0.746, 0.69], [0.746, 0.93]] },
  { points: [[0.746, 0.805], [0.892, 0.805]] },
  { points: [[0.618, 0.748], [0.616, 0.84], [0.638, 0.90], [0.672, 0.93]] },

  { points: [[0.654, 0.075], [0.66, 0.145], [0.685, 0.192], [0.72, 0.205], [0.755, 0.192], [0.78, 0.145], [0.786, 0.075]] },
  { points: [[0.72, 0.205], [0.72, 0.595]] },
  { points: [[0.648, 0.325], [0.792, 0.325]] },
  { points: [[0.658, 0.435], [0.664, 0.515], [0.69, 0.562], [0.72, 0.574], [0.75, 0.562], [0.776, 0.515], [0.782, 0.435]] },

  { points: [[0.942, 0.08], [0.895, 0.095], [0.86, 0.165], [0.848, 0.335], [0.86, 0.505], [0.895, 0.575], [0.942, 0.59]] },
  { points: [[0.942, 0.08], [0.954, 0.22], [0.956, 0.335], [0.954, 0.45], [0.942, 0.59]] },
  { points: [[0.858, 0.29], [0.942, 0.292]] },
  { points: [[0.862, 0.435], [0.942, 0.437]] },

  { points: [[0.106, 0.075], [0.096, 0.28], [0.118, 0.50], [0.096, 0.72], [0.108, 0.925]] },
  { points: [[0.036, 0.195], [0.052, 0.24], [0.056, 0.28], [0.044, 0.345]] },
  { points: [[0.036, 0.615], [0.052, 0.66], [0.056, 0.70], [0.044, 0.765]] },
  { points: [[0.172, 0.195], [0.158, 0.24], [0.154, 0.28], [0.166, 0.345]] },
  { points: [[0.172, 0.615], [0.158, 0.66], [0.154, 0.70], [0.166, 0.765]] },

  { points: [[0.272, 0.07], [0.272, 0.195], [0.245, 0.35], [0.236, 0.925]] },
  { points: [[0.245, 0.215], [0.355, 0.20], [0.425, 0.215], [0.448, 0.26], [0.448, 0.35]] },
  { points: [[0.35, 0.082], [0.35, 0.20]] },
  { points: [[0.245, 0.372], [0.292, 0.372], [0.294, 0.482]] },
  { points: [[0.335, 0.51], [0.342, 0.465], [0.386, 0.448], [0.43, 0.465], [0.436, 0.51], [0.425, 0.555], [0.386, 0.57], [0.346, 0.555], [0.335, 0.51]] },
  { points: [[0.295, 0.662], [0.345, 0.682], [0.386, 0.688], [0.428, 0.68], [0.456, 0.66]] },
  { points: [[0.386, 0.57], [0.386, 0.875], [0.374, 0.918], [0.342, 0.932]] },
];

const SU_YOU_SEAL_CHIPS: readonly SealChip[] = [
  { side: "top", at: 0.28, width: 0.12, depth: 0.044 },
  { side: "right", at: 0.66, width: 0.13, depth: 0.052 },
  { side: "bottom", at: 0.24, width: 0.14, depth: 0.048 },
  { side: "left", at: 0.16, width: 0.11, depth: 0.042 },
  { side: "right", at: 0.15, width: 0.09, depth: 0.036 },
];

export const suYouSealSpec: SealSpec = {
  mode: "intaglio",
  strokes: SU_YOU_SEAL_STROKES,
  chips: SU_YOU_SEAL_CHIPS,
  margin: 0.125,
  strokeWidth: 0.028,
  cornerRadius: 0.032,
  seed: 18399,
};

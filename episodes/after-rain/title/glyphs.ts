/**
 * 《雨后》片名「雨后」行楷字骨与署名「遡游」汉印满白文印字骨（全手写坐标，零字体文件）。
 * 笔顺严格遵守 GF 0023—2020《通用规范汉字笔顺规范》（「雨」印页 70：横、竖、横折钩、竖、四点左上→左下→右上→右下；「后」印页 27：撇、撇、横、竖、横折、横）。
 * 行楷笔法参照 docs/video/visual-style.md「行书与行楷」（故宫藏董其昌、刘墉藏锋折锋、杨凝式枯笔飞白）：
 * 横细竖粗、起笔藏锋顿按、行笔轻提、转折蓄墨、收笔按或锐利出锋、快笔连续飞白、字形抗肩欹侧，并以细牵丝与映带贯通「雨」外框→中竖与「后」口部。
 * 印文「遡游」依 spec #168 修订记录与 docs/video/visual-style.md「篆书字形依据」：右列「遡」（《说文》卷十一上水部「泝」或体，从辵、朔声，段注引《蒹葭》作「遡游」），
 * 左列「游」（《说文》卷七上㫃部字头，从㫃汓声），采用汉印缪篆满白文形制，笔画粗壮撑满印面，疏密匀称，兼顾 1:1 与 4 倍放大清晰辨识。待定事项：无。
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
    dry: 0.24,
    width: 0.1,
    seed: 18301,
    nodes: [
      { x: 0.242, y: 0.184, pressure: 0.98, speed: 0.32 },
      { x: 0.506, y: 0.148, pressure: 0.62, speed: 0.84 },
      { x: 0.77, y: 0.114, pressure: 1.12, speed: 0.32 },
    ],
  },
  {
    id: "yu-2-shu-left",
    entry: "hidden",
    exit: "press",
    dry: 0.24,
    width: 0.098,
    seed: 18302,
    nodes: [
      { x: 0.176, y: 0.314, pressure: 0.94, speed: 0.34 },
      { x: 0.15, y: 0.545, pressure: 0.84, speed: 0.7 },
      { x: 0.168, y: 0.776, pressure: 0.9, speed: 0.38 },
    ],
  },
  {
    id: "yu-3-hengzhegou",
    entry: "exposed",
    exit: "hook",
    dry: 0.72,
    width: 0.104,
    seed: 18303,
    nodes: [
      { x: 0.184, y: 0.346, pressure: 0.76, speed: 0.5 },
      { x: 0.515, y: 0.296, pressure: 0.68, speed: 0.86 },
      { x: 0.858, y: 0.244, pressure: 1.08, speed: 0.26, corner: true },
      { x: 0.844, y: 0.542, pressure: 0.94, speed: 0.98 },
      { x: 0.812, y: 0.84, pressure: 1.06, speed: 0.3, corner: true },
      { x: 0.728, y: 0.782, pressure: 0.84, speed: 0.76 },
      { x: 0.652, y: 0.736, pressure: 0.46, speed: 0.88 },
    ],
  },
  {
    id: "yu-4-shu-mid",
    entry: "exposed",
    exit: "taper",
    dry: 0.34,
    width: 0.102,
    seed: 18304,
    nodes: [
      { x: 0.542, y: 0.148, pressure: 0.52, speed: 0.62 },
      { x: 0.51, y: 0.186, pressure: 1.0, speed: 0.34 },
      { x: 0.5, y: 0.51, pressure: 0.9, speed: 0.78 },
      { x: 0.486, y: 0.888, pressure: 0.76, speed: 0.88 },
    ],
  },
];

const YU_DROPS: readonly NormDrop[] = [
  {
    id: "yu-5-dot-tl",
    start: [0.302, 0.348],
    width: 0.076,
    seed: 18305,
    nodes: [
      { x: 0.264, y: 0.422, pressure: 0.3, speed: 0.48 },
      { x: 0.31, y: 0.46, pressure: 0.94, speed: 0.38 },
      { x: 0.342, y: 0.494, pressure: 0.8, speed: 0.28 },
    ],
  },
  {
    id: "yu-6-dot-bl",
    start: [0.296, 0.486],
    width: 0.082,
    seed: 18306,
    nodes: [
      { x: 0.244, y: 0.624, pressure: 0.32, speed: 0.48 },
      { x: 0.306, y: 0.662, pressure: 0.98, speed: 0.38 },
      { x: 0.352, y: 0.69, pressure: 0.84, speed: 0.28 },
    ],
  },
  {
    id: "yu-7-dot-tr",
    start: [0.642, 0.322],
    width: 0.074,
    seed: 18307,
    nodes: [
      { x: 0.614, y: 0.4, pressure: 0.3, speed: 0.48 },
      { x: 0.664, y: 0.438, pressure: 0.94, speed: 0.38 },
      { x: 0.702, y: 0.472, pressure: 0.8, speed: 0.28 },
    ],
  },
  {
    id: "yu-8-dot-br",
    start: [0.638, 0.462],
    width: 0.082,
    seed: 18308,
    nodes: [
      { x: 0.59, y: 0.588, pressure: 0.32, speed: 0.48 },
      { x: 0.644, y: 0.624, pressure: 0.98, speed: 0.38 },
      { x: 0.686, y: 0.658, pressure: 0.84, speed: 0.28 },
    ],
  },
];

const HOU_STROKES: readonly NormStroke[] = [
  {
    id: "hou-1-pie-top",
    entry: "hidden",
    exit: "taper",
    dry: 0.34,
    width: 0.1,
    seed: 18311,
    nodes: [
      { x: 0.742, y: 0.106, pressure: 1.02, speed: 0.32 },
      { x: 0.504, y: 0.15, pressure: 0.76, speed: 0.84 },
      { x: 0.258, y: 0.198, pressure: 0.48, speed: 0.92 },
    ],
  },
  {
    id: "hou-2-pie-left",
    entry: "hidden",
    exit: "taper",
    dry: 0.74,
    width: 0.106,
    seed: 18312,
    nodes: [
      { x: 0.282, y: 0.204, pressure: 1.0, speed: 0.32 },
      { x: 0.268, y: 0.44, pressure: 0.94, speed: 0.74 },
      { x: 0.208, y: 0.688, pressure: 0.84, speed: 0.98 },
      { x: 0.094, y: 0.905, pressure: 0.52, speed: 0.92 },
    ],
  },
  {
    id: "hou-3-heng-long",
    entry: "hidden",
    exit: "press",
    dry: 0.9,
    width: 0.112,
    seed: 18313,
    nodes: [
      { x: 0.274, y: 0.418, pressure: 0.96, speed: 0.34 },
      { x: 0.588, y: 0.366, pressure: 0.84, speed: 1.0 },
      { x: 0.904, y: 0.326, pressure: 1.1, speed: 0.34 },
    ],
  },
  {
    id: "hou-4-kou-shu",
    entry: "exposed",
    exit: "press",
    dry: 0.26,
    width: 0.092,
    seed: 18314,
    nodes: [
      { x: 0.368, y: 0.562, pressure: 0.9, speed: 0.38 },
      { x: 0.388, y: 0.692, pressure: 0.86, speed: 0.64 },
      { x: 0.404, y: 0.822, pressure: 0.86, speed: 0.44 },
    ],
  },
  {
    id: "hou-5-kou-hengzhe",
    entry: "exposed",
    exit: "press",
    dry: 0.36,
    width: 0.098,
    seed: 18315,
    nodes: [
      { x: 0.378, y: 0.57, pressure: 0.7, speed: 0.52 },
      { x: 0.588, y: 0.532, pressure: 0.64, speed: 0.84 },
      { x: 0.794, y: 0.492, pressure: 1.1, speed: 0.26, corner: true },
      { x: 0.768, y: 0.646, pressure: 0.98, speed: 0.74 },
      { x: 0.734, y: 0.796, pressure: 0.96, speed: 0.42 },
    ],
  },
  {
    id: "hou-6-kou-heng",
    entry: "exposed",
    exit: "press",
    dry: 0.28,
    width: 0.09,
    seed: 18316,
    nodes: [
      { x: 0.406, y: 0.816, pressure: 0.76, speed: 0.46 },
      { x: 0.572, y: 0.794, pressure: 0.68, speed: 0.74 },
      { x: 0.742, y: 0.772, pressure: 0.96, speed: 0.38 },
    ],
  },
];

const YU_LIGATURES: readonly NormStroke[] = [
  {
    id: "yu-lig-frame-mid",
    entry: "exposed",
    exit: "taper",
    dry: 0.56,
    alpha: 0.48,
    width: 0.02,
    seed: 18341,
    nodes: [
      { x: 0.662, y: 0.74, pressure: 0.72, speed: 0.82 },
      { x: 0.612, y: 0.706, pressure: 0.48, speed: 0.92 },
      { x: 0.576, y: 0.674, pressure: 0.18, speed: 0.96 },
    ],
  },
];

const HOU_LIGATURES: readonly NormStroke[] = [
  {
    id: "hou-lig-kou-1",
    entry: "exposed",
    exit: "taper",
    dry: 0.34,
    alpha: 0.68,
    width: 0.028,
    seed: 18342,
    nodes: [
      { x: 0.402, y: 0.808, pressure: 0.82, speed: 0.72 },
      { x: 0.448, y: 0.732, pressure: 0.58, speed: 0.84 },
      { x: 0.416, y: 0.618, pressure: 0.26, speed: 0.92 },
    ],
  },
  {
    id: "hou-lig-kou-2",
    entry: "exposed",
    exit: "taper",
    dry: 0.36,
    alpha: 0.6,
    width: 0.026,
    seed: 18343,
    nodes: [
      { x: 0.734, y: 0.794, pressure: 0.78, speed: 0.74 },
      { x: 0.668, y: 0.752, pressure: 0.52, speed: 0.86 },
      { x: 0.592, y: 0.756, pressure: 0.22, speed: 0.92 },
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
  alpha: stroke.alpha,
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
  ligatures: CalligraphyStroke[];
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
    ligatures: [
      ...YU_LIGATURES.map((s) => mapGlyphStroke(s, left, topY, charSize)),
      ...HOU_LIGATURES.map((s) => mapGlyphStroke(s, left, houTop, charSize)),
    ],
    drops: YU_DROPS.map((d) => mapGlyphDrop(d, left, topY, charSize)),
  };
};

const SU_YOU_SEAL_STROKES: readonly SealStroke[] = [
  { points: [[0.572, 0.056], [0.546, 0.132], [0.514, 0.205]], width: 0.042 },
  { points: [[0.578, 0.268], [0.548, 0.346], [0.514, 0.418]], width: 0.042 },
  { points: [[0.546, 0.348], [0.546, 0.625]], width: 0.045 },
  { points: [[0.516, 0.955], [0.748, 0.955], [0.98, 0.955]], width: 0.052 },
  { points: [[0.748, 0.718], [0.748, 0.955]], width: 0.052 },
  { points: [[0.748, 0.834], [0.946, 0.834]], width: 0.048 },
  { points: [[0.588, 0.77], [0.588, 0.955]], width: 0.048 },

  { points: [[0.648, 0.052], [0.656, 0.13], [0.69, 0.186]], width: 0.042 },
  { points: [[0.816, 0.052], [0.806, 0.13], [0.772, 0.186]], width: 0.042 },
  { points: [[0.64, 0.222], [0.822, 0.222]], width: 0.045 },
  { points: [[0.646, 0.345], [0.646, 0.495], [0.816, 0.495], [0.816, 0.345]], width: 0.043 },
  { points: [[0.731, 0.222], [0.731, 0.635]], width: 0.046 },

  { points: [[0.896, 0.635], [0.896, 0.12], [0.916, 0.052], [0.976, 0.052], [0.976, 0.635]], width: 0.042 },
  { points: [[0.896, 0.255], [0.976, 0.255]], width: 0.04 },
  { points: [[0.896, 0.432], [0.976, 0.432]], width: 0.04 },

  { points: [[0.098, 0.048], [0.098, 0.955]], width: 0.046 },
  { points: [[0.024, 0.16], [0.024, 0.34]], width: 0.04 },
  { points: [[0.024, 0.625], [0.024, 0.805]], width: 0.04 },
  { points: [[0.172, 0.16], [0.172, 0.34]], width: 0.04 },
  { points: [[0.172, 0.625], [0.172, 0.805]], width: 0.04 },

  { points: [[0.244, 0.052], [0.244, 0.955]], width: 0.048 },
  { points: [[0.352, 0.046], [0.352, 0.174]], width: 0.046 },
  { points: [[0.244, 0.174], [0.456, 0.174], [0.456, 0.335]], width: 0.048 },
  { points: [[0.244, 0.305], [0.318, 0.305], [0.318, 0.372]], width: 0.042 },

  { points: [[0.338, 0.446], [0.452, 0.446], [0.452, 0.578], [0.338, 0.578], [0.338, 0.446]], width: 0.042 },
  { points: [[0.308, 0.704], [0.46, 0.704]], width: 0.048 },
  { points: [[0.398, 0.578], [0.398, 0.952], [0.326, 0.952]], width: 0.048 },
];

const SU_YOU_SEAL_CHIPS: readonly SealChip[] = [
  { side: "top", at: 0.28, width: 0.11, depth: 0.032 },
  { side: "right", at: 0.67, width: 0.12, depth: 0.036 },
  { side: "bottom", at: 0.24, width: 0.13, depth: 0.034 },
  { side: "left", at: 0.16, width: 0.1, depth: 0.03 },
  { side: "right", at: 0.15, width: 0.08, depth: 0.026 },
];

export const suYouSealSpec: SealSpec = {
  mode: "intaglio",
  strokes: SU_YOU_SEAL_STROKES,
  chips: SU_YOU_SEAL_CHIPS,
  margin: 0.068,
  strokeWidth: 0.046,
  cornerRadius: 0.028,
  seed: 18399,
};

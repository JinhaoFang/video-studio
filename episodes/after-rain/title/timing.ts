/**
 * 片名「雨后」与署名「遡游」印章的时间表与画面事件（单一事实源，不依赖浏览器）。
 * 全部书写、落点、盖印与淡出帧号均按「片名起点之后第几帧」导出（0 = 片名落笔起点）；
 * 画面事件种类严格遵守本期约定 contract.md 第 4 节：title_dot（四点落定）、seal_press（盖印）。
 * 第 12 镜与预览合成通过 titleEventsAtOffset(offset) 加上各自片名起点偏移（第 12 镜默认 64 帧），
 * 以便第 12 镜调整起止时间时片名组件本身无需改动。待定事项：无。
 */
import type { DropTiming, StrokeTiming } from "../../../src/kit/engine/calligraphy.ts";
import type { PictureEvent, ShotTiming } from "../../../src/kit/shots.ts";

export const SHOT12_DURATION = 216;
export const TITLE_START_OFFSET_SHOT12 = 64;
export const SEAL_PRESS_FRAME = 84;
export const SEAL_SETTLE_FRAMES = 2;
export const TITLE_FADE_START_FRAME = 132;
export const TITLE_FADE_END_FRAME = 151;

export const titleStrokeTimings: readonly StrokeTiming[] = [
  { id: "yu-1-heng", startFrame: 0, endFrame: 4, leave: 1.1, arrive: 1.3 },
  { id: "yu-2-shu-left", startFrame: 6, endFrame: 9, leave: 1.1, arrive: 1.2 },
  { id: "yu-3-hengzhegou", startFrame: 11, endFrame: 18, leave: 1.05, arrive: 1.25 },
  { id: "yu-4-shu-mid", startFrame: 20, endFrame: 24, leave: 1.1, arrive: 1.35 },
  { id: "hou-1-pie-top", startFrame: 50, endFrame: 53, leave: 0.95, arrive: 1.2 },
  { id: "hou-2-pie-left", startFrame: 55, endFrame: 60, leave: 1.0, arrive: 1.15 },
  { id: "hou-3-heng-long", startFrame: 62, endFrame: 66, leave: 1.05, arrive: 1.3 },
  { id: "hou-4-kou-shu", startFrame: 68, endFrame: 69, leave: 1.0, arrive: 1.2 },
  { id: "hou-5-kou-hengzhe", startFrame: 70, endFrame: 73, leave: 1.0, arrive: 1.25 },
  { id: "hou-6-kou-heng", startFrame: 74, endFrame: 76, leave: 1.0, arrive: 1.35 },
];

export const titleLigatureTimings: readonly StrokeTiming[] = [
  { id: "yu-lig-frame-mid", startFrame: 18, endFrame: 20, leave: 1.0, arrive: 1.0 },
  { id: "hou-lig-kou-1", startFrame: 69, endFrame: 70, leave: 1.0, arrive: 1.0 },
  { id: "hou-lig-kou-2", startFrame: 73, endFrame: 74, leave: 1.0, arrive: 1.0 },
];

export const titleDropTimings: readonly DropTiming[] = [
  { id: "yu-5-dot-tl", fallStartFrame: 22, landFrame: 26, settleFrames: 2 },
  { id: "yu-6-dot-bl", fallStartFrame: 29, landFrame: 33, settleFrames: 2 },
  { id: "yu-7-dot-tr", fallStartFrame: 36, landFrame: 40, settleFrames: 2 },
  { id: "yu-8-dot-br", fallStartFrame: 43, landFrame: 47, settleFrames: 2 },
];

const dropLabels: Record<string, string> = {
  "yu-5-dot-tl": "片名「雨」第一滴（左上点）落定成点",
  "yu-6-dot-bl": "片名「雨」第二滴（左下点）落定成点",
  "yu-7-dot-tr": "片名「雨」第三滴（右上点）落定成点",
  "yu-8-dot-br": "片名「雨」第四滴（右下点）落定成点",
};

export const titleEvents: readonly PictureEvent[] = [
  ...titleDropTimings.map((drop) => ({
    frame: drop.landFrame,
    kind: "title_dot",
    description: dropLabels[drop.id],
  })),
  {
    frame: SEAL_PRESS_FRAME,
    kind: "seal_press",
    description: "署名「遡游」满白文印盖下",
  },
];

export const titleEventsAtOffset = (startFrame: number): PictureEvent[] =>
  titleEvents.map((ev) => ({
    ...ev,
    frame: ev.frame + startFrame,
  }));

export const titlePreviewTiming: ShotTiming = {
  id: "S12-title",
  durationInFrames: SHOT12_DURATION,
  events: titleEventsAtOffset(TITLE_START_OFFSET_SHOT12),
};

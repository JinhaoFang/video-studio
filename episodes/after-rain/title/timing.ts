/**
 * 第 12 镜片名「雨后」与署名「溯游」印章的时间表与画面事件（单一事实源，不依赖浏览器）。
 * 帧号照 episodes/after-rain/storyboard.md 第 12 镜锚点：总长 216 帧（9.0 秒，24 fps），
 * 「雨」外框与中竖 64–88、四点 90/97/104/111 落定、「后」114–140、盖印 148、停顿至 195、196–215 淡出。
 * 画面事件种类 title_drip、seal_stamp 待 #179 本期约定确认（TODO(design)）。
 */
import type { DropTiming, StrokeTiming } from "../../../src/kit/engine/calligraphy.ts";
import type { PictureEvent, ShotTiming } from "../../../src/kit/shots.ts";

export const SHOT12_DURATION = 216;
export const SEAL_STAMP_FRAME = 148;
export const SEAL_SETTLE_FRAMES = 2;
export const FADE_START_FRAME = 196;
export const FADE_END_FRAME = 215;

export const titleStrokeTimings: readonly StrokeTiming[] = [
  { id: "yu-1-heng", startFrame: 64, endFrame: 68, leave: 1.1, arrive: 1.3 },
  { id: "yu-2-shu-left", startFrame: 70, endFrame: 73, leave: 1.1, arrive: 1.2 },
  { id: "yu-3-hengzhegou", startFrame: 75, endFrame: 82, leave: 1.05, arrive: 1.25 },
  { id: "yu-4-shu-mid", startFrame: 84, endFrame: 88, leave: 1.1, arrive: 1.35 },
  { id: "hou-1-pie-top", startFrame: 114, endFrame: 117, leave: 0.95, arrive: 1.2 },
  { id: "hou-2-pie-left", startFrame: 119, endFrame: 124, leave: 1.0, arrive: 1.15 },
  { id: "hou-3-heng-long", startFrame: 126, endFrame: 130, leave: 1.05, arrive: 1.3 },
  { id: "hou-4-kou-shu", startFrame: 132, endFrame: 133, leave: 1.0, arrive: 1.2 },
  { id: "hou-5-kou-hengzhe", startFrame: 134, endFrame: 137, leave: 1.0, arrive: 1.25 },
  { id: "hou-6-kou-heng", startFrame: 138, endFrame: 140, leave: 1.0, arrive: 1.35 },
];

export const titleDropTimings: readonly DropTiming[] = [
  { id: "yu-5-dot-tl", fallStartFrame: 86, landFrame: 90, settleFrames: 2 },
  { id: "yu-6-dot-bl", fallStartFrame: 93, landFrame: 97, settleFrames: 2 },
  { id: "yu-7-dot-tr", fallStartFrame: 100, landFrame: 104, settleFrames: 2 },
  { id: "yu-8-dot-br", fallStartFrame: 107, landFrame: 111, settleFrames: 2 },
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
    kind: "title_drip",
    description: dropLabels[drop.id],
  })),
  {
    frame: SEAL_STAMP_FRAME,
    kind: "seal_stamp",
    description: "署名「遡游」白文印盖下",
  },
];

export const titlePreviewTiming: ShotTiming = {
  id: "S12-title",
  durationInFrames: SHOT12_DURATION,
  events: titleEvents,
};

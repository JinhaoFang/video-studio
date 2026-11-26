/**
 * 第 1–2 镜（起）的时间数据与画面事件：镜头内帧号严格对齐 storyboard.md「镜头内的锚点」与 contract.md 第 4 节。
 * 不依赖浏览器，供镜头渲染、生成器与测试共用；动画和事件共用同一组常量。
 * 待定事项：无。
 */
import { ease, progress } from "../../../../src/kit/engine/timing.ts";
import type { ShotTiming } from "../../../../src/kit/shots.ts";

export const S01_DURATION = 144;
export const S01_FADE_START = 8;
export const S01_FADE_END = 30;
export const S01_LIGHTNING = 84;
export const S01_THUNDER = 110;

export const s01CameraProgress = (frame: number) =>
  ease(progress(frame, 0, S01_DURATION - 1), 2.2, 2.2);

export const s01Timing: ShotTiming = {
  id: "s01",
  durationInFrames: S01_DURATION,
  events: [
    { frame: 0, kind: "open", description: "全片第 0 帧，雨声先进" },
    { frame: S01_LIGHTNING, kind: "lightning", description: "云里闪一次闪电" },
    { frame: S01_THUNDER, kind: "thunder", description: "画外：远雷，闪电后约 1.1 秒" },
  ],
};

export const S02_DURATION = 144;
export const S02_COMPANION_1 = 24;
export const S02_GLANCE = 28;
export const S02_COMPANION_2 = 60;
export const S02_CALL_WEAK = 64;
export const S02_CLAW_SHIFT = 66;
export const S02_WING_LIFT = 80;
export const S02_SHIVER = 92;
export const S02_HUDDLE = 104;

export const s02CameraProgress = (frame: number) =>
  ease(progress(frame, 0, S02_DURATION - 1), 2.0, 2.0);

export const s02Timing: ShotTiming = {
  id: "s02",
  durationInFrames: S02_DURATION,
  events: [
    { frame: S02_COMPANION_1, kind: "companion_call", description: "画外：画右远处同伴的第一串接触叫" },
    { frame: S02_GLANCE, kind: "glance", description: "抬头转向画右张望，开始转的那一帧" },
    { frame: S02_COMPANION_2, kind: "companion_call", description: "画外：画右远处同伴的第二串接触叫" },
    { frame: S02_CALL_WEAK, kind: "call_weak", description: "麻雀叫声第 1 声：很弱的接触叫" },
    { frame: S02_CLAW_SHIFT, kind: "claw_shift", description: "脚爪在竹竿上挪一下" },
    { frame: S02_WING_LIFT, kind: "wing_lift", description: "翅膀稍稍一抬" },
    { frame: S02_SHIVER, kind: "shiver", description: "打寒战，抖落水珠" },
    { frame: S02_HUDDLE, kind: "huddle", description: "缩回去，开始缩的那一帧" },
  ],
};

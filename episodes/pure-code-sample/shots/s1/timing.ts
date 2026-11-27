/**
 * 镜头 S1「雨停」的时间：时长、画面事件，以及决定事件帧的几条时间曲线（雨量、光到达的纵深、相机推进、水珠）。
 * 不依赖浏览器，镜头和生成器都读；帧号都是镜头内帧号。光的前沿用"已经照到的最近纵深"（米）表示，从远处扫到近处。
 */
import { ease, progress } from "../../../../src/kit/engine/timing.ts";
import type { ShotTiming } from "../../../../src/kit/shots.ts";

export const DURATION = 168;

export const rainAmount = (frame: number) => 1 - ease(progress(frame, 0, 88), 1, 1.8);

const FRONT_START = 26;
const FRONT_END = 118;
const FAR = Math.log(2600);
const NEAR = Math.log(0.6);

export const lightFront = (frame: number) => {
  if (frame < FRONT_START) return Infinity;
  const u = Math.pow(ease(progress(frame, FRONT_START, FRONT_END), 1.2, 1.4), 0.6);
  return Math.exp(FAR + (NEAR - FAR) * u);
};

export const skyFront = (frame: number) => 2900 * ease(progress(frame, 24, 84), 1.4, 1.2);

export const cameraProgress = (frame: number) => ease(progress(frame, 0, DURATION - 1), 2.6, 2.2);

const firstFrame = (test: (frame: number) => boolean) => {
  for (let f = 0; f < DURATION; f++) if (test(f)) return f;
  return DURATION - 1;
};

export const LIGHT_BREAK = firstFrame((f) => lightFront(f) <= 160);
export const LIGHT_ON_BIRD = firstFrame((f) => lightFront(f) <= 3);
export const DRIP_FALL = 145;
export const DRIP_ENTER = 147;
export const DRIP_HIT = 151;

export const s1Timing: ShotTiming = {
  id: "S1",
  durationInFrames: DURATION,
  events: [
    { frame: 0, kind: "rain_tail", description: "雨的尾声从第一帧开始渐稀" },
    { frame: LIGHT_BREAK, kind: "light_break", description: "夕光从云缝里第一次照到远处的稻田" },
    { frame: DRIP_FALL, kind: "drip_fall", description: "檐口那颗长大的水珠离开檐口（画外上方）" },
    { frame: DRIP_HIT, kind: "drip_hit", description: "水珠打中麻雀头顶，它眼睛一闭" },
  ],
};

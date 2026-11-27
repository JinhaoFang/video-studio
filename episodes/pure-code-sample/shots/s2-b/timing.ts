/**
 * S2 B 版的 Node/浏览器共用镜头元数据；表演事件从 acting.ts 迁出，水珠落地帧保留原 drops.ts 弹道计算结果 95/97/100/102/104/109。
 * 事件帧是画张第一次到达该姿势的帧：一缩最紧的画张从第 5 帧起，第一次甩到端点的画张从第 9 帧起（acting.ts 的 held、swing），drops.ts 第一批甩水也从第 9 帧起。
 */
import type { PictureEvent, ShotTiming } from "../../../../src/kit/shots.ts";

export const DURATION = 144;
export const beats = {
  flinch: 5,
  shakes: [9, 14, 18, 21],
  puff: 22,
  hush: 24,
  lookUp: 48,
  crouch: 64,
  lowest: 70,
  takeoff: 77,
  wingbeats: [80, 84, 88, 92, 96],
  settle: 114,
};
const describe = (
  frame: number,
  kind: string,
  description: string,
): PictureEvent => ({ frame, kind, description });
export const s2Timing: ShotTiming = {
  id: "S2",
  durationInFrames: DURATION,
  events: [
    describe(beats.flinch, "flinch", "被打中后一缩，收到最紧"),
    describe(beats.shakes[0], "shake", "第一次甩头抖身，甩到一端"),
    describe(beats.shakes[1], "shake", "第二次甩头抖身，甩到另一端"),
    describe(beats.shakes[2], "shake", "第三次甩头抖身"),
    describe(beats.shakes[3], "shake", "第四次甩头抖身，幅度渐小"),
    describe(beats.puff, "puff", "抖完羽毛蓬到最大"),
    describe(beats.hush, "hush", "蓬成一团停住，静默开始"),
    describe(beats.lookUp, "look_up", "抬头看向画右上的夕光，眼里亮起光点"),
    describe(beats.crouch, "crouch", "起飞前开始压低身子"),
    describe(beats.takeoff, "takeoff", "脚离开竹竿"),
    describe(78, "pole_spring", "竹竿下沉后弹回的第一下"),
    ...beats.wingbeats.map((frame, index) =>
      describe(frame, "wingbeat", `第 ${index + 1} 次振翅下扑到最低`),
    ),
    describe(beats.settle, "settle", "相机停稳在空竹竿和夕光上"),
    ...[95, 97, 100, 102, 104, 109].map((frame, index) =>
      describe(frame, "pole_drip", `竹竿甩下的第 ${index + 1} 颗水珠落地`),
    ),
  ].sort((a, b) => a.frame - b.frame),
};

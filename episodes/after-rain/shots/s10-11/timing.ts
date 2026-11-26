/**
 * 第 10–11 镜（合）的时间数据与画面事件：对齐 storyboard.md「镜头内的锚点」、motion.md「起飞」「振翅循环」「波浪式飞行」「降落」与 contract.md 第 4 节。
 * 镜头的动画（姿势、位置、翅膀遮挡、鸟群）和画面事件都从这里取帧号：扑翅事件落在每一下下扑的那一帧，鸟群的挪动事件从 flockMemberState 推出（哪只鸟哪一帧离线）。
 * 不依赖浏览器，供镜头渲染、生成器与测试共用。
 * 待定事项：无。
 */
import { createFlock, flockFlightState, flockMemberState } from "../../flock.ts";
import type { FlockBirdState, FlockMember } from "../../flock.ts";
import { timeShot } from "../../model.ts";

export const S10_TURN_END = 12;
export const S10_CROUCH = 12;
export const S10_CROUCH_END = 44;
export const S10_HOLD_END = 54;
export const S10_PUSH = 54;
export const S10_TAKEOFF = 56;
export const S10_POLE_SPRING = 57;
export const S10_FLAPS: readonly (readonly [number, number])[] = [
  [58, 4],
  [62, 4],
  [66, 4],
  [70, 4],
  [74, 3],
  [77, 3],
  [80, 3],
];
export const S10_WING_START = 74;
export const S10_WING_PASS = 76;
export const S10_COVERED = 81;
export const S10_LAST = 83;
export const S11_WING_OFFSET = S10_LAST - S10_WING_START + 1;
export const S10_SMEAR_FRAMES = [56, 59] as const;

export type FlapPhase = { index: number; start: number; length: number; phase: number };

export const s10FlapAt = (frame: number): FlapPhase | null => {
  for (let i = 0; i < S10_FLAPS.length; i++) {
    const [start, length] = S10_FLAPS[i];
    if (frame >= start && frame < start + length) {
      return { index: i, start, length, phase: frame - start };
    }
  }
  return null;
};

export const s10WingbeatFrames = (): number[] => S10_FLAPS.map(([start]) => start + 1);

export const s10Timing = timeShot({
  id: "s10",
  events: [
    { frame: S10_CROUCH, kind: "crouch", description: "起飞前开始压身" },
    { frame: S10_TAKEOFF, kind: "takeoff", description: "脚离开竹竿" },
    { frame: S10_POLE_SPRING, kind: "pole_spring", description: "竹竿被蹬下沉后弹回的第一下" },
    ...s10WingbeatFrames().map((frame, i) => ({
      frame,
      kind: "wingbeat",
      description: i === 0 ? "起飞第一下大下扑" : `迎面冲向镜头第 ${i + 1} 下扑翅`,
    })),
    { frame: S10_WING_PASS, kind: "wing_pass", description: "翅膀开始遮满画面，掠过镜头的风声起" },
  ].sort((a, b) => a.frame - b.frame),
});

export const S11_REVEAL_END = 10;
export const S11_FLIGHT_START = 10;
export const S11_FLIGHT_PERIOD = 18;
export const S11_LAND = 150;
export const S11_LAND_X = 47.5;
export const S11_CALL_HOME = 158;
export const S11_COMPANION_CALLS_NEAR = [120, 132] as const;
export const S11_COMPANION_REPLIES = [164, 170, 176] as const;
export const S11_CAMERA_STOP = 172;

export const s11HeroState = (frame: number): FlockBirdState & { waveY: number } =>
  flockFlightState(frame, {
    phaseOffset: S11_FLIGHT_PERIOD - S11_FLIGHT_START,
    landingFrame: S11_LAND,
    facing: 1,
  });

export const s11WingbeatFrames = (): number[] => {
  const out: number[] = [];
  let previous = s11HeroState(S11_FLIGHT_START).wingFlap;
  for (let frame = S11_FLIGHT_START + 1; frame < S11_LAND; frame++) {
    const current = s11HeroState(frame).wingFlap;
    if (current < 0 && previous >= 0) out.push(frame);
    previous = current;
  }
  return out;
};

type PerchedMember = FlockMember & { x: number };

const NEIGHBOR_SLOT_SPAN = 11;
const COMPANION_LAYOUT: readonly (readonly [number, number])[] = [
  [41.8, 3],
  [43.9, 5],
  [45.6, 4],
  [49.4, 1],
  [51.6, 2],
  [54.0, 0],
];

const withSlots = (members: readonly FlockMember[]): PerchedMember[] =>
  COMPANION_LAYOUT.map(([x, id]) => {
    const base = members.find((item) => item.id === id)!;
    return {
      ...base,
      slot: 0.5 + (x - S11_LAND_X) / NEIGHBOR_SLOT_SPAN,
      x,
    };
  });

export const s11Companions: readonly PerchedMember[] = withSlots(createFlock(6, 180));
export const s11LandSlot = 0.5;

export const s11CompanionState = (member: PerchedMember, frame: number): FlockBirdState =>
  flockMemberState(member, frame, { frame: S11_LAND, slot: s11LandSlot });

export const s11HopStarts = (): readonly { id: number; frame: number }[] => {
  const out: { id: number; frame: number }[] = [];
  for (const member of s11Companions) {
    for (let frame = S11_LAND; frame < S11_LAND + 40; frame++) {
      if (!s11CompanionState(member, frame).legs && s11CompanionState(member, frame - 1).legs) {
        out.push({ id: member.id, frame });
        break;
      }
    }
  }
  return out;
};

export const s11Timing = timeShot({
  id: "s11",
  events: [
    ...s11WingbeatFrames().map((frame) => ({
      frame,
      kind: "wingbeat",
      description: frame < S11_LAND - 10 ? "稻田上空波浪式飞行扑翅段下扑" : "落地前刹车扑翅",
    })),
    ...S11_COMPANION_CALLS_NEAR.map((frame) => ({
      frame,
      kind: "companion_call",
      description: "画外：电线上同伴的叫声越飞越近",
    })),
    { frame: S11_LAND, kind: "land", description: "落到电线上，在同伴中间" },
    ...s11HopStarts().map(({ id, frame }) => ({
      frame,
      kind: "flock_shift",
      description: `旁边的同伴（第 ${id + 1} 只）双脚离线挪开`,
    })),
    { frame: S11_CALL_HOME, kind: "call_home", description: "麻雀叫声第 5 声：回到同伴中间的接触叫" },
    ...S11_COMPANION_REPLIES.map((frame) => ({
      frame,
      kind: "companion_call",
      description: "电线上旁边的同伴回应的接触叫",
    })),
  ].sort((a, b) => a.frame - b.frame),
});


/**
 * 第 4–6 镜（承）的时间数据与画面事件：对齐 storyboard.md「镜头内的锚点」「时间表」（#186 之后）、motion.md 与 contract.md 第 4 节。
 * 走路的事件帧从同一份步态参数推出来：第 4 镜的走路画张号 = 镜头帧 + S04_POSE_OFFSET（第 3 镜第 158 帧那一脚落在本镜第 −10 帧，J 切声音先行）；
 * 后脚离地落在下一脚着地之后（支撑期减一步，再被泥吸住 2 帧）；竹篮比腿晚 5 帧摆到头（mudWalkPose 的 lagFrames），停步后按 stopTurnPose 的衰减摆取前三次。
 * 不依赖浏览器，供镜头渲染、生成器与测试共用。
 * 待定事项：无。
 */
import type { StopTurnTiming } from "../../person.ts";
import { rng } from "../../../../src/kit/engine/random.ts";
import { fps, timeShot } from "../../model.ts";
import { pole } from "../../scene.ts";

export const S04_POSE_OFFSET = 10;
export const S04_STEP_FRAMES = 24;
export const S04_MUD_STEPS = [14, 38] as const;
export const S04_PUDDLE_STEP = 62;
export const S04_SPLASH_PEAK = 71;

const stanceFrames = (stepFrames: number) => stepFrames * 2 * 0.72;

const pullFrames = (landings: readonly number[], stepFrames: number, muddy: number) =>
  landings.map((landing) => landing + Math.floor(stanceFrames(stepFrames) - stepFrames + 2 * muddy));

const basketCreakFrames = (poseOffset: number, stepFrames: number, from: number, to: number) => {
  const cycle = stepFrames * 2;
  const out: number[] = [];
  for (let shot = from; shot <= to; shot++) {
    const phase = (((shot + poseOffset - 5) % cycle) + cycle) % cycle;
    if (phase === cycle / 4 || phase === (cycle * 3) / 4) out.push(shot);
  }
  return out;
};

export const S04_MUD_PULLS = pullFrames([...S04_MUD_STEPS, S04_PUDDLE_STEP], S04_STEP_FRAMES, 1).filter(
  (frame) => frame <= S04_SPLASH_PEAK,
);
export const S04_BASKET_CREAKS = basketCreakFrames(S04_POSE_OFFSET, S04_STEP_FRAMES, 0, S04_SPLASH_PEAK);

export const s04Timing = timeShot({
  id: "s04",
  events: [
    ...S04_MUD_STEPS.map((frame, i) => ({
      frame,
      kind: "mud_step",
      description: `胶鞋陷进湿泥第 ${i + 2} 步踩实（第 1 步在第 3 镜第 158 帧，画外）`,
    })),
    ...S04_MUD_PULLS.map((frame) => ({
      frame,
      kind: "mud_pull",
      description: "胶鞋从泥里拔出，脚跟离地",
    })),
    ...S04_BASKET_CREAKS.map((frame) => ({
      frame,
      kind: "basket_creak",
      description: "竹篮摆到头吱呀一声",
    })),
    { frame: S04_PUDDLE_STEP, kind: "puddle_step", description: "最后一步踩进水洼，倒影碎开" },
    { frame: S04_SPLASH_PEAK, kind: "splash_peak", description: "水花溅到最高，4→5 切点" },
  ].sort((a, b) => a.frame - b.frame),
});

export const S05_FLINCH = 0;
export const S05_CALL_ALARM = 0;
export const S05_WINDUP = 4;
export const S05_PUSH_OFF = 22;
export const S05_FLAPS = [24, 27, 30, 33] as const;
export const S05_HUSH = 40;
export const S05_DROP = 48;
export const S05_FALL_BACK = 54;
export const S05_BALANCE_FLAPS = [56, 59] as const;
export const S05_POLE_SPRING = 59;
export const S05_STEADY = 84;
export const S05_CALL_SMALL = 94;
const s05Drops = (() => {
  const r = rng(1885, 54);
  const drops = [];
  const bursts = [
    ...S05_FLAPS.map((f) => [f, 1, 4, 1]),
    [S05_FALL_BACK + 1, 4, 6, 1.6],
    ...S05_BALANCE_FLAPS.map((f) => [f, 2, 2, 1.2]),
  ];
  for (const [spawn, landers, flyers, power] of bursts) {
    for (let i = 0; i < landers + flyers; i++) {
      const lander = i < landers;
      drops.push({
        spawn,
        side: r.next() < 0.5 ? 1 : -1,
        lateral: lander ? r.range(0.08, 0.28) : r.range(0.6, 1.5) * power,
        up: lander ? r.range(0.3, 0.9) * power : r.range(-0.4, 0.5) * power,
        forward: r.range(-0.1, 0.3),
        size: r.next() < 0.3 ? r.range(3.6, 5.2) : r.range(2.2, 3.6),
      });
    }
  }
  return drops;
})();

const landingFrames: number[] = [];
for (const { spawn, lateral, up } of s05Drops) {
  const seconds = (up + Math.sqrt(up * up + 2 * 4.9 * 0.09)) / 9.8;
  if (Math.abs(lateral * seconds) < pole.radius * 1.6)
    landingFrames.push(Math.ceil(spawn + seconds * fps));
}
landingFrames.sort((a, b) => a - b);

export const S05_DROP_LANDS = landingFrames.filter((frame, i) => i === 0 || frame - landingFrames[i - 1] >= 2);

export const s05Timing = timeShot({
  id: "s05",
  events: [
    { frame: S05_FLINCH, kind: "flinch", description: "溅水声一响，麻雀一缩" },
    { frame: S05_CALL_ALARM, kind: "call_alarm", description: "麻雀叫声第 2 声：两个音的警报叫" },
    { frame: S05_WINDUP, kind: "windup", description: "起飞失败的大预备，开始压身" },
    { frame: S05_PUSH_OFF, kind: "push_off", description: "起飞失败蹬竿" },
    ...S05_FLAPS.map((frame, i) => ({
      frame,
      kind: "flap_wet",
      description: `湿翅膀拼命下扑第 ${i + 1} 下`,
    })),
    ...S05_BALANCE_FLAPS.map((frame, i) => ({
      frame,
      kind: "flap_wet",
      description: `落回竹竿乱扑保持平衡第 ${i + 1} 下`,
    })),
    ...S05_DROP_LANDS.map((frame) => ({
      frame,
      kind: "drop_land",
      description: "甩出的水珠落到竹竿或地上",
    })),
    { frame: S05_HUSH, kind: "hush", description: "半空悬停开始，不出新音、环境声不断" },
    { frame: S05_DROP, kind: "drop", description: "从半空开始掉" },
    { frame: S05_FALL_BACK, kind: "fall_back", description: "掉回竹竿" },
    { frame: S05_POLE_SPRING, kind: "pole_spring", description: "竹竿下沉后弹回的第一下" },
    { frame: S05_STEADY, kind: "steady", description: "在竹竿上稳住并转向画右" },
    { frame: S05_CALL_SMALL, kind: "call_small", description: "麻雀叫声第 3 声：喘着气的一小声" },
  ].sort((a, b) => a.frame - b.frame),
});

export const S06_STOP_TIMING: StopTurnTiming = {
  settle: 4,
  turnIn: [
    [6, 10],
    [14, 20],
  ],
  hold: [22, 37],
  turnOut: [
    [40, 44],
    [48, 52],
  ],
  resume: 54,
  firstStep: 58,
  firstLead: "right",
  stepFrames: 20,
};

export const S06_STEP_STOP = S06_STOP_TIMING.settle;
export const S06_TOE_TURNS = [
  S06_STOP_TIMING.turnIn[0][1],
  S06_STOP_TIMING.turnIn[1][1],
  S06_STOP_TIMING.turnOut[0][1],
  S06_STOP_TIMING.turnOut[1][1],
] as const;
export const S06_HUM_START = S06_STOP_TIMING.resume;
export const S06_POSE_OFFSET = S06_STOP_TIMING.stepFrames - S06_STOP_TIMING.firstStep;
export const S06_STEPS = [S06_STOP_TIMING.firstStep, S06_STOP_TIMING.firstStep + S06_STOP_TIMING.stepFrames] as const;
export const S06_PULLS = pullFrames(S06_STEPS, S06_STOP_TIMING.stepFrames, 0.3);
const S06_STOP_CREAKS = [1, 2, 3].map((k) => Math.round(S06_STOP_TIMING.settle + 5.5 * k));
export const S06_BASKET_CREAKS = [
  ...S06_STOP_CREAKS,
  ...basketCreakFrames(S06_POSE_OFFSET, S06_STOP_TIMING.stepFrames, S06_HUM_START, 95),
];

export const s06Timing = timeShot({
  id: "s06",
  events: [
    { frame: S06_STEP_STOP, kind: "step_stop", description: "停步的最后一脚" },
    ...S06_TOE_TURNS.map((frame, i) => ({
      frame,
      kind: "toe_turn",
      description: i < 2 ? "脚尖转向麻雀的一小步踩实" : "脚尖转回小路的一小步踩实",
    })),
    { frame: S06_HUM_START, kind: "hum_start", description: "那个人边走边轻轻哼唱起" },
    ...S06_STEPS.map((frame, i) => ({
      frame,
      kind: "mud_step",
      description: `离开院子第 ${i + 1} 步踩实`,
    })),
    ...S06_PULLS.map((frame) => ({
      frame,
      kind: "mud_pull",
      description: "胶鞋从湿路抬起离地",
    })),
    ...S06_BASKET_CREAKS.map((frame) => ({
      frame,
      kind: "basket_creak",
      description: "竹篮摆到头吱呀一声",
    })),
  ].sort((a, b) => a.frame - b.frame),
});

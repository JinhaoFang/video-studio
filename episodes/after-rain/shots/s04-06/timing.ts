/**
 * 第 4–6 镜（承）的时间数据与画面事件：对齐 storyboard.md「镜头内的锚点」、motion.md 与 contract.md 第 4 节。
 * 不依赖浏览器，供镜头渲染、生成器与测试共用。
 * 待定事项：无。
 */
import { ease, progress } from "../../../../src/kit/engine/timing.ts";
import { timeShot } from "../../model.ts";

export const S04_MUD_STEPS = [14, 38, 62] as const;
export const S04_MUD_PULLS = [26, 50, 74] as const;
export const S04_BASKET_CREAKS = [20, 44, 68] as const;
export const S04_PUDDLE_STEP = 86;
export const S04_SPLASH_PEAK = 95;

export const s04CameraProgress = (frame: number) =>
  ease(progress(frame, 0, s04Timing.durationInFrames - 1), 1.8, 1.8);

export const s04Timing = timeShot({
  id: "s04",
  events: [
    ...S04_MUD_STEPS.map((frame, i) => ({
      frame,
      kind: "mud_step",
      description: `胶鞋陷进湿泥第 ${i + 1} 步踩实`,
    })),
    ...S04_MUD_PULLS.map((frame, i) => ({
      frame,
      kind: "mud_pull",
      description: `胶鞋从泥里拔出第 ${i + 1} 步脚跟离地`,
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
export const S05_CALL_ALARM = 1;
export const S05_WINDUP = 4;
export const S05_PUSH_OFF = 22;
export const S05_FLAPS = [24, 27, 30, 33, 56, 59] as const;
export const S05_DROP_LANDS = [38, 66] as const;
export const S05_HUSH = 40;
export const S05_DROP = 48;
export const S05_FALL_BACK = 54;
export const S05_POLE_SPRING = 59;
export const S05_STEADY = 90;
export const S05_CALL_SMALL = 100;

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
      description: i < 4 ? `湿翅膀拼命下扑第 ${i + 1} 下` : "落回竹竿乱扑保持平衡",
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

export const S06_STEP_STOP = 4;
export const S06_TOE_TURNS = [14, 26, 62, 70] as const;
export const S06_HUM_START = 74;
export const S06_STEPS = [78, 98, 118] as const;
export const S06_PULLS = [90, 110] as const;
export const S06_BASKET_CREAKS = [10, 84, 104] as const;

export const s06Timing = timeShot({
  id: "s06",
  events: [
    { frame: S06_STEP_STOP, kind: "step_stop", description: "停步的最后一脚" },
    ...S06_TOE_TURNS.map((frame, i) => ({
      frame,
      kind: "toe_turn",
      description: i < 2 ? "脚尖转向麻雀的一小步" : "脚尖转回小路的一小步",
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

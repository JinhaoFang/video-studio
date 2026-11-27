/**
 * 第 7–9 镜（转）的时间数据与画面事件：对齐 storyboard.md「镜头内的锚点」、motion.md 与 contract.md 第 4 节。
 * 不依赖浏览器，供镜头渲染、生成器与测试共用。
 * 待定事项：无。
 */
import { timeShot } from "../../model.ts";

export const S07_SHAKE_1 = [10, 14] as const;
export const S07_SHAKE_2 = [28, 30, 34, 36] as const;
export const S07_SHAKE_3 = [56, 58, 60, 62, 64, 66, 68, 70] as const;
export const S07_DROP_LANDS = [20, 42, 74] as const;
export const S07_PUFF = 76;
export const S07_BLINK = 88;

export const s07Timing = timeShot({
  id: "s07",
  events: [
    ...S07_SHAKE_1.map((frame) => ({ frame, kind: "shake", description: "第一次甩水（只甩头）变向" })),
    ...S07_SHAKE_2.map((frame) => ({ frame, kind: "shake", description: "第二次甩水（连身子）变向" })),
    ...S07_SHAKE_3.map((frame) => ({ frame, kind: "shake", description: "第三次甩水（全身猛甩）变向" })),
    ...S07_DROP_LANDS.map((frame) => ({ frame, kind: "drop_land", description: "甩出的水珠落到竹竿或地上" })),
    { frame: S07_PUFF, kind: "puff", description: "甩完蓬成滑稽圆球" },
  ].sort((a, b) => a.frame - b.frame),
});

export const S08_HUSH = 0;
export const S08_BLINK_1 = 50;
export const S08_BLINK_2 = 110;

export const s08Timing = timeShot({
  id: "s08",
  events: [
    { frame: S08_HUSH, kind: "hush", description: "全片唯一长静默开始，不出新音、环境声不断" },
  ],
});

export const S09_EYE_OPEN = 8;
export const S09_LOOK_START = 20;
export const S09_LOOK_UP = 30;
export const S09_COMPANION_CALL = 56;
export const S09_CLAW_SHIFT = 70;
export const S09_CALL_CLEAR = 78;

export const s09Timing = timeShot({
  id: "s09",
  events: [
    { frame: S09_LOOK_UP, kind: "look_up", description: "抬头到位，眼中光点亮起" },
    { frame: S09_COMPANION_CALL, kind: "companion_call", description: "画外：远处同伴的接触叫再次响起" },
    { frame: S09_CLAW_SHIFT, kind: "claw_shift", description: "脚爪在竹竿上挪一下" },
    { frame: S09_CALL_CLEAR, kind: "call_clear", description: "麻雀叫声第 4 声：清楚的接触叫" },
  ],
});
